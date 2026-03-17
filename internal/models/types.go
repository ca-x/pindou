package models

// RegisterRequest 用户注册请求
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=20"`
	Password string `json:"password" binding:"required,min=6,max=50"`
}

// LoginRequest 用户登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserResponse 用户信息响应
type UserResponse struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	CreatedAt string `json:"created_at"`
}

// DesignRequest 作品请求
type DesignRequest struct {
	Title      string       `json:"title"`
	Width      int          `json:"width"`
	Height     int          `json:"height"`
	ColorCount int          `json:"color_count"`
	GridData   [][]*CellData `json:"grid_data"`
}

// CellData 格子数据
type CellData struct {
	ID string `json:"id"`
	N  string `json:"n"`
	H  string `json:"h"`
}

// DesignResponse 作品响应
type DesignResponse struct {
	ID         string        `json:"id"`
	Title      string        `json:"title"`
	Width      int           `json:"width"`
	Height     int           `json:"height"`
	ColorCount int           `json:"color_count"`
	GridData   [][]*CellData `json:"grid_data"`
	IsPublic   bool          `json:"is_public"`
	ShareCode  string        `json:"share_code,omitempty"`
	CreatedAt  string        `json:"created_at"`
	UpdatedAt  string        `json:"updated_at"`
}

// DesignListResponse 作品列表响应
type DesignListResponse struct {
	ID         string        `json:"id"`
	Title      string        `json:"title"`
	Width      int           `json:"width"`
	Height     int           `json:"height"`
	ColorCount int           `json:"color_count"`
	GridData   [][]*CellData `json:"grid_data"`
	IsPublic   bool          `json:"is_public"`
	ShareCode  string        `json:"share_code,omitempty"`
	UpdatedAt  string        `json:"updated_at"`
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}