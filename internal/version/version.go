package version

import "runtime"

var (
	// Version is the semantic version (set by ldflags)
	Version = "dev"
	// BuildTime is the build timestamp (set by ldflags)
	BuildTime = "unknown"
	// GitCommit is the git commit hash (set by ldflags)
	GitCommit = "unknown"
)

// Info returns version information
func Info() map[string]string {
	return map[string]string{
		"version":    Version,
		"build_time": BuildTime,
		"git_commit": GitCommit,
		"go_version": runtime.Version(),
		"platform":   runtime.GOOS + "/" + runtime.GOARCH,
	}
}