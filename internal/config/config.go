package config

import (
	"os"
	"path/filepath"
)

type Config struct {
	DatabasePath string
	Port         string
	SessionSecret string
}

func Load() *Config {
	home, _ := os.UserHomeDir()
	dataDir := filepath.Join(home, ".pindou")
	os.MkdirAll(dataDir, 0755)

	return &Config{
		DatabasePath:  filepath.Join(dataDir, "pindou.db"),
		Port:          getEnv("PORT", "8080"),
		SessionSecret: getEnv("SESSION_SECRET", "pindou-secret-key-change-in-production"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}