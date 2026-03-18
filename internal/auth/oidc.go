package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"pindou/ent"
	"pindou/ent/user"
	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
)

// Environment variable names for OIDC configuration.
const (
	envOIDCClientID     = "PINDOU_OIDC_CLIENT_ID"
	envOIDCClientSecret = "PINDOU_OIDC_CLIENT_SECRET"
	envOIDCAuthURI      = "PINDOU_OIDC_AUTH_URI"
	envOIDCTokenURI     = "PINDOU_OIDC_TOKEN_URI"
	envOIDCUserInfoURI  = "PINDOU_OIDC_USERINFO_URI"
	envOIDCRedirectURL  = "PINDOU_OIDC_REDIRECT_URL"
	envOIDCCallbackPath = "PINDOU_OIDC_CALLBACK_PATH"
	envAppURL           = "PINDOU_APP_URL"
)

// Default paths for OIDC endpoints.
const (
	defaultOIDCCallbackPath = "/api/auth/oidc/callback"
	defaultAppURL           = "http://localhost:8080"
)

// Cookie configuration.
const (
	cookieOIDCState = "oidc_state"
	stateMaxAge     = 300 // 5 minutes
)

// OIDCConfig holds the OIDC provider configuration.
type OIDCConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	AuthURL      string
	TokenURL     string
	UserInfoURL  string
}

// OIDCProvider manages OIDC authentication.
type OIDCProvider struct {
	config      *oauth2.Config
	userInfoURL string
	client      *ent.Client
}

// NewOIDCProvider creates a new OIDC provider from environment variables.
func NewOIDCProvider(client *ent.Client) (*OIDCProvider, error) {
	config, err := loadOIDCConfig()
	if err != nil {
		return nil, err
	}

	log.Printf("OIDC configured with client ID: %s", config.ClientID)

	return createOIDCProvider(config, client)
}

// IsOIDCConfigured checks if OIDC is properly configured.
func IsOIDCConfigured() bool {
	clientID := os.Getenv(envOIDCClientID)
	clientSecret := os.Getenv(envOIDCClientSecret)
	authURL := os.Getenv(envOIDCAuthURI)
	tokenURL := os.Getenv(envOIDCTokenURI)
	return clientID != "" && clientSecret != "" && authURL != "" && tokenURL != ""
}

// loadOIDCConfig reads OIDC configuration from environment variables.
func loadOIDCConfig() (*OIDCConfig, error) {
	clientID := os.Getenv(envOIDCClientID)
	clientSecret := os.Getenv(envOIDCClientSecret)
	authURL := os.Getenv(envOIDCAuthURI)
	tokenURL := os.Getenv(envOIDCTokenURI)
	userInfoURL := os.Getenv(envOIDCUserInfoURI)

	if clientID == "" || clientSecret == "" || authURL == "" || tokenURL == "" {
		return nil, errors.New("missing required OIDC configuration")
	}

	return &OIDCConfig{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  buildRedirectURL(),
		AuthURL:      authURL,
		TokenURL:     tokenURL,
		UserInfoURL:  userInfoURL,
	}, nil
}

// createOIDCProvider creates an OIDCProvider from the given configuration.
func createOIDCProvider(config *OIDCConfig, client *ent.Client) (*OIDCProvider, error) {
	oauth2Config := &oauth2.Config{
		ClientID:     config.ClientID,
		ClientSecret: config.ClientSecret,
		RedirectURL:  config.RedirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  config.AuthURL,
			TokenURL: config.TokenURL,
		},
	}

	return &OIDCProvider{
		config:      oauth2Config,
		userInfoURL: config.UserInfoURL,
		client:      client,
	}, nil
}

// buildRedirectURL constructs the OAuth2 redirect URL.
func buildRedirectURL() string {
	if redirectURL := os.Getenv(envOIDCRedirectURL); redirectURL != "" {
		return redirectURL
	}

	appURL := getEnvOrDefault(envAppURL, defaultAppURL)
	callbackPath := getEnvOrDefault(envOIDCCallbackPath, defaultOIDCCallbackPath)

	return fmt.Sprintf("%s%s", appURL, callbackPath)
}

// getEnvOrDefault returns the environment variable value or a default.
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GetOIDCCallbackPath returns the configured OIDC callback path.
func GetOIDCCallbackPath() string {
	return getEnvOrDefault(envOIDCCallbackPath, defaultOIDCCallbackPath)
}

// generateState generates a cryptographically random state string for CSRF protection.
func generateState() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// HandleLogin initiates the OIDC login flow.
func (p *OIDCProvider) HandleLogin(c *gin.Context) {
	state := generateState()
	c.SetCookie(cookieOIDCState, state, stateMaxAge, "/", "", false, true)

	authURL := p.config.AuthCodeURL(state)
	c.Redirect(http.StatusFound, authURL)
}

// HandleCallback processes the OIDC callback after authentication.
func (p *OIDCProvider) HandleCallback(c *gin.Context) {
	if err := p.validateState(c); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Clear state cookie
	c.SetCookie(cookieOIDCState, "", -1, "/", "", false, true)

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing authorization code"})
		return
	}

	ctx := context.Background()
	token, err := p.config.Exchange(ctx, code)
	if err != nil {
		log.Printf("Failed to exchange token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange token"})
		return
	}

	userInfo, err := p.fetchUserInfo(ctx, token)
	if err != nil {
		log.Printf("Warning: Failed to fetch user info: %v", err)
	}

	oidcUserID, username := extractUserIdentity(userInfo)
	if oidcUserID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user ID"})
		return
	}

	// Find or create user in local database
	u, err := p.findOrCreateUser(ctx, oidcUserID, username)
	if err != nil {
		log.Printf("Failed to find/create user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user session"})
		return
	}

	// Generate session token
	sessionToken := generateToken()
	sessionExpires := time.Now().Add(7 * 24 * time.Hour)

	_, err = u.Update().SetSessionToken(sessionToken).SetSessionExpires(sessionExpires).Save(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}

	c.SetCookie("session", sessionToken, 7*24*3600, "/", "", false, true)
	c.Redirect(http.StatusFound, "/")
}

// validateState verifies the OIDC state parameter matches the cookie.
func (p *OIDCProvider) validateState(c *gin.Context) error {
	expectedState, err := c.Cookie(cookieOIDCState)
	if err != nil {
		return errors.New("missing state cookie")
	}

	if c.Query("state") != expectedState {
		return errors.New("invalid state")
	}

	return nil
}

// fetchUserInfo retrieves user information from the OIDC provider.
func (p *OIDCProvider) fetchUserInfo(ctx context.Context, token *oauth2.Token) (map[string]interface{}, error) {
	if p.userInfoURL == "" {
		return nil, errors.New("user info URL not configured")
	}

	client := p.config.Client(ctx, token)
	resp, err := client.Get(p.userInfoURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user info: %w", err)
	}
	defer resp.Body.Close()

	var userInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	return userInfo, nil
}

// extractUserIdentity extracts the user ID and username from the user info response.
func extractUserIdentity(userInfo map[string]interface{}) (userID, username string) {
	if userInfo == nil {
		return "", ""
	}

	// Try to get user ID from various claims
	if sub, ok := userInfo["sub"].(string); ok {
		userID = sub
	}

	// Try to get username
	if preferredUsername, ok := userInfo["preferred_username"].(string); ok {
		username = preferredUsername
	} else if name, ok := userInfo["name"].(string); ok {
		username = name
	} else if email, ok := userInfo["email"].(string); ok {
		username = strings.Split(email, "@")[0]
	} else {
		username = userID
	}

	return userID, username
}

// findOrCreateUser finds an existing user or creates a new one for OIDC login.
func (p *OIDCProvider) findOrCreateUser(ctx context.Context, oidcUserID, username string) (*ent.User, error) {
	// Try to find user by OIDC ID (stored in username field with oidc_ prefix)
	oidcUsername := "oidc_" + oidcUserID

	u, err := p.client.User.Query().
		Where(user.Username(oidcUsername)).
		Only(ctx)

	if err == nil {
		return u, nil
	}

	if !ent.IsNotFound(err) {
		return nil, err
	}

	// Create new user for OIDC login
	// Password is empty for OIDC users
	sessionToken := generateToken()
	sessionExpires := time.Now().Add(7 * 24 * time.Hour)

	u, err = p.client.User.Create().
		SetID(generateID()).
		SetUsername(oidcUsername).
		SetPasswordHash("").
		SetSessionToken(sessionToken).
		SetSessionExpires(sessionExpires).
		Save(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return u, nil
}

// generateID generates a random ID.
func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// generateToken generates a random session token.
func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// SetPasswordForOIDCUser allows OIDC users to set a password for local login.
func SetPasswordForOIDCUser(ctx context.Context, client *ent.Client, u *ent.User, newPassword string) error {
	// Verify this is an OIDC user (empty password hash)
	if u.PasswordHash != "" {
		return errors.New("password already set")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	_, err = u.Update().SetPasswordHash(string(hashedPassword)).Save(ctx)
	return err
}