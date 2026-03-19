package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/lib-x/entsqlite"
	"pindou/ent"
)

func New(dsn string) (*ent.Client, error) {
	if err := os.MkdirAll(filepath.Dir(dsn), 0o755); err != nil {
		return nil, fmt.Errorf("create database directory for %s: %w", dsn, err)
	}

	// 使用文件模式，支持WAL和更好的并发
	connStr := fmt.Sprintf("file:%s?cache=shared&_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=busy_timeout(10000)", dsn)
	client, err := ent.Open("sqlite3", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := client.Schema.Create(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	log.Printf("Database initialized successfully: %s", dsn)
	return client, nil
}
