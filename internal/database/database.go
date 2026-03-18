package database

import (
	"context"
	"fmt"
	"log"

	_ "github.com/lib-x/entsqlite"
	"pindou/ent"
)

func New(dsn string) (*ent.Client, error) {
	// 使用文件模式，支持WAL和更好的并发
	connStr := fmt.Sprintf("file:%s?cache=shared&_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=busy_timeout(10000)", dsn)
	client, err := ent.Open("sqlite3", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := client.Schema.Create(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	log.Println("Database initialized successfully")
	return client, nil
}
