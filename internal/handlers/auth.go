package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"pindou/ent"
	"pindou/ent/user"
	"pindou/internal/models"
)

type AuthHandler struct {
	client        *ent.Client
	sessionSecret string
}

func NewAuthHandler(client *ent.Client, sessionSecret string) *AuthHandler {
	return &AuthHandler{client: client, sessionSecret: sessionSecret}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request", Message: err.Error()})
		return
	}

	exists, _ := h.client.User.Query().Where(user.Username(req.Username)).Exist(c.Request.Context())
	if exists {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: "username already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to hash password"})
		return
	}

	sessionToken := generateToken()
	sessionExpires := time.Now().Add(7 * 24 * time.Hour)

	u, err := h.client.User.Create().
		SetID(generateID()).
		SetUsername(req.Username).
		SetPasswordHash(string(hashedPassword)).
		SetSessionToken(sessionToken).
		SetSessionExpires(sessionExpires).
		Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create user"})
		return
	}

	c.SetCookie("session", sessionToken, 7*24*3600, "/", "", false, true)
	c.JSON(http.StatusOK, models.UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		CreatedAt: u.CreatedAt.Format(time.RFC3339),
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	// Prevent OIDC users from logging in with username/password
	if strings.HasPrefix(req.Username, "oidc_") {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "please use OIDC login for this account"})
		return
	}

	u, err := h.client.User.Query().Where(user.Username(req.Username)).Only(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "invalid credentials"})
		return
	}

	// Check if password is set (OIDC users have empty password)
	if u.PasswordHash == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "password not set for this account, please use OIDC login"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "invalid credentials"})
		return
	}

	sessionToken := generateToken()
	sessionExpires := time.Now().Add(7 * 24 * time.Hour)

	_, err = u.Update().SetSessionToken(sessionToken).SetSessionExpires(sessionExpires).Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create session"})
		return
	}

	c.SetCookie("session", sessionToken, 7*24*3600, "/", "", false, true)
	c.JSON(http.StatusOK, models.UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		CreatedAt: u.CreatedAt.Format(time.RFC3339),
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	sessionToken, err := c.Cookie("session")
	if err == nil {
		u, _ := h.client.User.Query().Where(user.SessionToken(sessionToken)).Only(c.Request.Context())
		if u != nil {
			u.Update().ClearSessionToken().ClearSessionExpires().Save(c.Request.Context())
		}
	}
	c.SetCookie("session", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)
	c.JSON(http.StatusOK, models.UserResponse{
		ID:        userEnt.ID,
		Username:  userEnt.Username,
		Nickname:  userEnt.Nickname,
		CreatedAt: userEnt.CreatedAt.Format(time.RFC3339),
	})
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	// Validate nickname length
	if len(req.Nickname) > 30 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "nickname too long (max 30 characters)"})
		return
	}

	updatedUser, err := userEnt.Update().SetNickname(req.Nickname).Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, models.UserResponse{
		ID:        updatedUser.ID,
		Username:  updatedUser.Username,
		Nickname:  updatedUser.Nickname,
		CreatedAt: updatedUser.CreatedAt.Format(time.RFC3339),
	})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request", Message: err.Error()})
		return
	}

	// 如果用户没有密码（OIDC 用户），允许设置新密码
	if userEnt.PasswordHash == "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to hash password"})
			return
		}

		_, err = userEnt.Update().SetPasswordHash(string(hashedPassword)).Save(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to set password"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "password set successfully"})
		return
	}

	// 验证旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(userEnt.PasswordHash), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "invalid old password"})
		return
	}

	// 生成新密码哈希
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to hash password"})
		return
	}

	// 更新密码
	_, err = userEnt.Update().SetPasswordHash(string(hashedPassword)).Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password changed successfully"})
}

func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}
