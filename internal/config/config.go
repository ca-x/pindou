package config

import (
	"os"
	"path/filepath"
)

type Config struct {
	DatabasePath  string
	Port          string
	SessionSecret string
	// OIDC Configuration
	OIDCClientID     string
	OIDCClientSecret string
	OIDCAuthURI      string
	OIDCTokenURI     string
	OIDCUserInfoURI  string
	OIDCRedirectURL  string
	AppURL           string
}

func Load() *Config {
	home, _ := os.UserHomeDir()
	dataDir := filepath.Join(home, ".pindou")
	_ = os.MkdirAll(dataDir, 0o755)

	databasePath := getEnv("DATABASE_PATH", filepath.Join(dataDir, "pindou.db"))

	return &Config{
		DatabasePath:     databasePath,
		Port:             getEnv("PORT", "8080"),
		SessionSecret:    getEnv("SESSION_SECRET", "pindou-secret-key-change-in-production"),
		OIDCClientID:     os.Getenv("PINDOU_OIDC_CLIENT_ID"),
		OIDCClientSecret: os.Getenv("PINDOU_OIDC_CLIENT_SECRET"),
		OIDCAuthURI:      os.Getenv("PINDOU_OIDC_AUTH_URI"),
		OIDCTokenURI:     os.Getenv("PINDOU_OIDC_TOKEN_URI"),
		OIDCUserInfoURI:  os.Getenv("PINDOU_OIDC_USERINFO_URI"),
		OIDCRedirectURL:  os.Getenv("PINDOU_OIDC_REDIRECT_URL"),
		AppURL:           getEnv("PINDOU_APP_URL", "http://localhost:8080"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
