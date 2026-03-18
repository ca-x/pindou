package main

import (
	"io/fs"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"pindou/internal/auth"
	"pindou/internal/config"
	"pindou/internal/database"
	"pindou/internal/handlers"
	"pindou/internal/middleware"
	"pindou/internal/version"
	"pindou/web"
)

func main() {
	cfg := config.Load()

	client, err := database.New(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer client.Close()

	// Initialize OIDC provider if configured
	var oidcProvider *auth.OIDCProvider
	if auth.IsOIDCConfigured() {
		oidcProvider, err = auth.NewOIDCProvider(client)
		if err != nil {
			log.Printf("Warning: Failed to initialize OIDC: %v", err)
		} else {
			log.Println("OIDC authentication enabled")
		}
	}

	r := gin.Default()

	// Static files from embedded FS
	staticFS, _ := fs.Sub(web.Files, "static")
	r.StaticFS("/static", http.FS(staticFS))

	// API routes
	api := r.Group("/api")
	{
		// Version info (public)
		api.GET("/version", func(c *gin.Context) {
			c.JSON(200, version.Info())
		})

		// OIDC status (public)
		api.GET("/auth/oidc/status", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"enabled": oidcProvider != nil,
			})
		})

		authHandler := handlers.NewAuthHandler(client, cfg.SessionSecret)
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
			authGroup.POST("/logout", authHandler.Logout)
			authGroup.GET("/me", middleware.Auth(client), authHandler.Me)
			authGroup.PUT("/profile", middleware.Auth(client), authHandler.UpdateProfile)
			authGroup.PUT("/password", middleware.Auth(client), authHandler.ChangePassword)

			// OIDC routes
			if oidcProvider != nil {
				authGroup.GET("/oidc/login", oidcProvider.HandleLogin)
				authGroup.GET("/oidc/callback", oidcProvider.HandleCallback)
			}
		}

		designHandler := handlers.NewDesignHandler(client)
		designs := api.Group("/designs")
		designs.Use(middleware.Auth(client))
		{
			designs.GET("", designHandler.List)
			designs.POST("", designHandler.Create)
			designs.GET("/:id", designHandler.Get)
			designs.PUT("/:id", designHandler.Update)
			designs.DELETE("/:id", designHandler.Delete)
			designs.POST("/:id/share", designHandler.Share)
		}

		// Public share endpoint
		api.GET("/share/:code", designHandler.GetShared)
	}

	// Frontend routes - serve index.html
	r.GET("/", func(c *gin.Context) {
		data, _ := web.Files.ReadFile("index.html")
		c.Data(200, "text/html; charset=utf-8", data)
	})

	r.GET("/share/:code", func(c *gin.Context) {
		data, _ := web.Files.ReadFile("index.html")
		c.Data(200, "text/html; charset=utf-8", data)
	})

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
