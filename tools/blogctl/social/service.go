package social

import (
	"context"
	"errors"
	"fmt"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/social/buffer"
)

type BufferAPI interface {
	Channels(context.Context) ([]buffer.Channel, error)
	Post(context.Context, string) (buffer.RemotePost, error)
	CreateDraft(context.Context, buffer.PostPayload) (buffer.RemotePost, error)
	PublishDraft(context.Context, string) (buffer.RemotePost, error)
}
type Service struct {
	DataRoot string
	Buffer   BufferAPI
}

func (s Service) approved(id, platform, revision string) (Draft, Post, buffer.Channel, error) {
	draft, err := Load(s.DataRoot, id)
	if err != nil {
		return Draft{}, Post{}, buffer.Channel{}, err
	}
	post, ok := draft.Posts[platform]
	if !ok {
		return Draft{}, Post{}, buffer.Channel{}, fmt.Errorf("no %s content", platform)
	}
	if !draft.Ready() || revision != draft.Revision {
		return Draft{}, Post{}, buffer.Channel{}, errors.New("draft is not approved for this exact content revision")
	}
	return draft, post, buffer.Channel{}, nil
}
func (s Service) channel(ctx context.Context, platform string) (buffer.Channel, error) {
	channels, err := s.Buffer.Channels(ctx)
	if err != nil {
		return buffer.Channel{}, err
	}
	var result buffer.Channel
	for _, ch := range channels {
		if ch.Service != platform {
			continue
		}
		if result.ID != "" {
			return buffer.Channel{}, errors.New("multiple channels; explicit selection is required")
		}
		result = ch
	}
	if result.ID == "" {
		return buffer.Channel{}, fmt.Errorf("%s not connected", platform)
	}
	if result.IsLocked || result.IsDisconnected {
		return buffer.Channel{}, fmt.Errorf("%s unavailable", platform)
	}
	return result, nil
}
func (s Service) Stage(ctx context.Context, id, platform, revision string) (Draft, error) {
	draft, err := Load(s.DataRoot, id)
	if err != nil {
		return Draft{}, err
	}
	if revision == "" || draft.Revision != revision {
		return Draft{}, errors.New("draft revision mismatch; reload and review before staging")
	}
	post, ok := draft.Posts[platform]
	if !ok {
		return Draft{}, fmt.Errorf("no %s content", platform)
	}
	channel, err := s.channel(ctx, platform)
	if err != nil {
		return Draft{}, err
	}
	state := draft.Remote[platform]
	if state.ID != "" || state.State != "" {
		return Draft{}, errors.New("remote state already exists or is uncertain; inspect Buffer before retry")
	}
	// An explicit stage request confirms the current content revision.
	// Record approval and the pending remote write in one atomic local save.
	draft.ApprovedRevision = draft.Revision
	state = Remote{ChannelID: channel.ID, State: "creating"}
	if draft.Remote == nil {
		draft.Remote = map[string]Remote{}
	}
	draft.Remote[platform] = state
	if err = Save(s.DataRoot, draft); err != nil {
		return Draft{}, err
	}
	// Writes are never retried: a timeout can mean the remote draft was created.
	payload := buffer.PostPayload{ChannelID: channel.ID, Text: RenderText(draft.Source.URL, platform, post), ImageURL: post.MediaURL}
	if post.LinkCard && platform == "linkedin" {
		payload.LinkCard = map[string]any{"url": draft.Source.URL}
	}
	remote, err := s.Buffer.CreateDraft(ctx, payload)
	if err != nil {
		return Draft{}, fmt.Errorf("remote create outcome uncertain; inspect Buffer: %w", err)
	}
	state.ID = remote.ID
	state.State = "draft"
	if remote.Status != "draft" || remote.ChannelID != channel.ID {
		state.State = "uncertain"
		state.Error = "unexpected remote state"
	}
	draft.Remote[platform] = state
	if err = Save(s.DataRoot, draft); err != nil {
		return Draft{}, err
	}
	if state.State != "draft" {
		return Draft{}, errors.New("remote draft created but state unexpected")
	}
	return draft, nil
}
func (s Service) Publish(ctx context.Context, id, platform, revision string) (Draft, error) {
	draft, post, _, err := s.approved(id, platform, revision)
	if err != nil {
		return Draft{}, err
	}
	channel, err := s.channel(ctx, platform)
	if err != nil {
		return Draft{}, err
	}
	state := draft.Remote[platform]
	if state.State != "draft" || state.ID == "" || state.ChannelID != channel.ID {
		return Draft{}, errors.New("no verified remote draft to publish")
	}
	remote, err := s.Buffer.Post(ctx, state.ID)
	if err != nil {
		return Draft{}, err
	}
	if remote.ChannelID != channel.ID || remote.Status != "draft" || remote.Text != RenderText(draft.Source.URL, platform, post) {
		return Draft{}, errors.New("Buffer remote draft differs from reviewed content")
	}
	state.State = "publishing"
	draft.Remote[platform] = state
	if err = Save(s.DataRoot, draft); err != nil {
		return Draft{}, err
	}
	result, err := s.Buffer.PublishDraft(ctx, state.ID)
	if err != nil {
		return Draft{}, fmt.Errorf("publish outcome uncertain; inspect Buffer: %w", err)
	}
	state.State = "submitted"
	if result.Status == "sent" {
		state.State = "sent"
	}
	draft.Remote[platform] = state
	if err = Save(s.DataRoot, draft); err != nil {
		return Draft{}, err
	}
	return draft, nil
}
