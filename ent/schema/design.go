package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Design holds the schema definition for the Design entity.
type Design struct {
	ent.Schema
}

// Annotations of the Design.
func (Design) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "designs"},
	}
}

// Fields of the Design.
func (Design) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("user_id").
			NotEmpty().
			Comment("所属用户ID"),
		field.String("title").
			Default("未命名作品").
			Comment("作品标题"),
		field.Int("width").
			Default(32).
			Comment("宽度(格子数)"),
		field.Int("height").
			Default(32).
			Comment("高度(格子数)"),
		field.Int("color_count").
			Default(48).
			Comment("颜色数量"),
		field.Text("grid_data").
			Comment("网格数据(JSON)"),
		field.String("share_code").
			Optional().
			Comment("分享码"),
		field.Bool("is_public").
			Default(false).
			Comment("是否公开"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the Design.
func (Design) Edges() []ent.Edge {
	return nil
}

// Indexes of the Design.
func (Design) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("share_code").Unique(),
		index.Fields("created_at"),
	}
}