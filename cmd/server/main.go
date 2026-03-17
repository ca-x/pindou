package main

import (
	"io/fs"
	"log"
	"net/http"

	"pindou/internal/config"
	"pindou/internal/database"
	"pindou/internal/handlers"
	"pindou/internal/middleware"
	"pindou/internal/version"
	"pindou/web"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	client, err := database.New(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer client.Close()

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

		authHandler := handlers.NewAuthHandler(client, cfg.SessionSecret)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", middleware.Auth(client), authHandler.Me)
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