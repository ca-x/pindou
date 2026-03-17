package middleware

import (
	"net/http"
	"time"

	"pindou/ent"
	"pindou/ent/user"
	"pindou/internal/models"
	"github.com/gin-gonic/gin"
)

func Auth(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionToken, err := c.Cookie("session")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
			return
		}

		u, err := client.User.Query().
			Where(
				user.SessionToken(sessionToken),
				user.SessionExpiresGT(time.Now()),
			).
			Only(c.Request.Context())
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
			return
		}

		c.Set("user", u)
		c.Next()
	}
}

func OptionalAuth(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionToken, err := c.Cookie("session")
		if err != nil {
			c.Next()
			return
		}

		u, err := client.User.Query().
			Where(
				user.SessionToken(sessionToken),
				user.SessionExpiresGT(time.Now()),
			).
			Only(c.Request.Context())
		if err != nil {
			c.Next()
			return
		}

		c.Set("user", u)
		c.Next()
	}
}