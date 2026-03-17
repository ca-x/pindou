package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"pindou/ent"
	"pindou/ent/design"
	"pindou/internal/models"
	"github.com/gin-gonic/gin"
)

type DesignHandler struct {
	client *ent.Client
}

func NewDesignHandler(client *ent.Client) *DesignHandler {
	return &DesignHandler{client: client}
}

func (h *DesignHandler) List(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)

	designs, err := h.client.Design.Query().
		Where(design.UserIDEQ(userEnt.ID)).
		Order(ent.Desc(design.FieldUpdatedAt)).
		All(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch designs"})
		return
	}

	var resp []models.DesignListResponse
	for _, d := range designs {
		var gridData [][]*models.CellData
		json.Unmarshal([]byte(d.GridData), &gridData)

		resp = append(resp, models.DesignListResponse{
			ID:         d.ID,
			Title:      d.Title,
			Width:      d.Width,
			Height:     d.Height,
			ColorCount: d.ColorCount,
			GridData:   gridData,
			IsPublic:   d.IsPublic,
			ShareCode:  d.ShareCode,
			UpdatedAt:  d.UpdatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, resp)
}

func (h *DesignHandler) Create(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)

	var req models.DesignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	gridJSON, err := json.Marshal(req.GridData)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid grid data"})
		return
	}

	d, err := h.client.Design.Create().
		SetID(generateID()).
		SetUserID(userEnt.ID).
		SetTitle(req.Title).
		SetWidth(req.Width).
		SetHeight(req.Height).
		SetColorCount(req.ColorCount).
		SetGridData(string(gridJSON)).
		Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create design"})
		return
	}

	c.JSON(http.StatusCreated, h.toResponse(d))
}

func (h *DesignHandler) Get(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)
	id := c.Param("id")

	d, err := h.client.Design.Query().
		Where(design.IDEQ(id), design.UserIDEQ(userEnt.ID)).
		Only(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "design not found"})
		return
	}

	c.JSON(http.StatusOK, h.toResponse(d))
}

func (h *DesignHandler) Update(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)
	id := c.Param("id")

	d, err := h.client.Design.Query().
		Where(design.IDEQ(id), design.UserIDEQ(userEnt.ID)).
		Only(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "design not found"})
		return
	}

	var req models.DesignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	gridJSON, _ := json.Marshal(req.GridData)

	d, err = d.Update().
		SetTitle(req.Title).
		SetWidth(req.Width).
		SetHeight(req.Height).
		SetColorCount(req.ColorCount).
		SetGridData(string(gridJSON)).
		Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update design"})
		return
	}

	c.JSON(http.StatusOK, h.toResponse(d))
}

func (h *DesignHandler) Delete(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)
	id := c.Param("id")

	_, err := h.client.Design.Delete().
		Where(design.IDEQ(id), design.UserIDEQ(userEnt.ID)).
		Exec(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to delete design"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *DesignHandler) Share(c *gin.Context) {
	u, _ := c.Get("user")
	userEnt := u.(*ent.User)
	id := c.Param("id")

	d, err := h.client.Design.Query().
		Where(design.IDEQ(id), design.UserIDEQ(userEnt.ID)).
		Only(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "design not found"})
		return
	}

	shareCode := generateToken()[:8]
	d, err = d.Update().
		SetIsPublic(true).
		SetShareCode(shareCode).
		Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create share"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"share_code": shareCode})
}

func (h *DesignHandler) GetShared(c *gin.Context) {
	code := c.Param("code")

	d, err := h.client.Design.Query().
		Where(design.ShareCodeEQ(code), design.IsPublicEQ(true)).
		Only(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "design not found or not public"})
		return
	}

	c.JSON(http.StatusOK, h.toResponse(d))
}

func (h *DesignHandler) toResponse(d *ent.Design) models.DesignResponse {
	var gridData [][]*models.CellData
	json.Unmarshal([]byte(d.GridData), &gridData)

	return models.DesignResponse{
		ID:         d.ID,
		Title:      d.Title,
		Width:      d.Width,
		Height:     d.Height,
		ColorCount: d.ColorCount,
		GridData:   gridData,
		IsPublic:   d.IsPublic,
		ShareCode:  d.ShareCode,
		CreatedAt:  d.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  d.UpdatedAt.Format(time.RFC3339),
	}
}