package publisher

import (
	"context"
	"errors"
	"net/url"
	"strings"
)

type cnBlogsAdapterFactory struct{}

func (cnBlogsAdapterFactory) PlatformID() string { return "cnblogs" }

func (cnBlogsAdapterFactory) New(dependencies AdapterDependencies, session Session) (PlatformAdapter, error) {
	adapter, err := NewCNBlogsAdapter(dependencies.HTTPClient, session)
	if err != nil {
		return nil, err
	}
	return adapter.(*cnBlogsAdapter), nil
}

func (c *cnBlogsAdapter) Capabilities() PlatformCapabilities {
	return PlatformCapabilities{
		SearchDrafts: true, SearchPublished: true, VerifyReference: true,
		CreateDraft: true, UpdateDraft: true, PublishPrepared: true,
		DirectPublishedUpdate: true, MultiTarget: true,
	}
}

func cnBlogsEditURL(id string) string {
	return cnBlogsOrigin + "/articles/edit;postId=" + url.QueryEscape(id)
}

func cnBlogsTargetID(post CNBlogsPost, state string) (articleID, draftID string) {
	if state == "published" {
		return post.ID, ""
	}
	return "", post.ID
}

func cnBlogsRemoteTarget(username string, post CNBlogsPost) RemoteTarget {
	state := post.RemoteState
	if state == "" {
		if post.Published {
			state = "published"
		} else {
			state = "draft"
		}
	}
	articleID, draftID := cnBlogsTargetID(post, state)
	return RemoteTarget{
		Platform: "cnblogs", AccountKey: "cnblogs:" + username,
		RemoteArticleID: articleID, RemoteDraftID: draftID, RemoteState: state,
		EditURL: cnBlogsEditURL(post.ID), PublicURL: post.URL, RemoteUpdatedAt: post.UpdatedAt,
	}
}

func cnBlogsCandidate(post CNBlogsPost) RemoteCandidate {
	candidate := RemoteCandidate{
		Title: post.Title, RemoteState: post.RemoteState,
		EditURL: cnBlogsEditURL(post.ID), PublicURL: post.URL, UpdatedAt: post.UpdatedAt,
	}
	if candidate.RemoteState == "published" {
		candidate.RemoteArticleID = post.ID
	} else {
		candidate.RemoteDraftID = post.ID
	}
	return candidate
}

func (c *cnBlogsAdapter) SearchTargets(ctx context.Context, query SearchQuery) ([]RemoteCandidate, error) {
	search := strings.TrimSpace(query.Title)
	if search == "" {
		search = strings.TrimSpace(query.Slug)
	}
	candidates := []RemoteCandidate{}
	drafts, err := c.searchDraftPosts(ctx, search)
	if err != nil {
		return nil, err
	}
	for _, post := range drafts {
		candidates = append(candidates, cnBlogsCandidate(post))
	}
	published, err := c.searchPublishedPosts(ctx, search)
	if err != nil {
		return nil, err
	}
	for _, post := range published {
		candidates = append(candidates, cnBlogsCandidate(post))
	}
	return candidates, nil
}

func (c *cnBlogsAdapter) VerifyTarget(ctx context.Context, reference RemoteReference) (RemoteTarget, error) {
	id, err := ParseCNBlogsPostReference(reference.Raw)
	if err != nil {
		return RemoteTarget{}, err
	}
	value, err := c.fetchPost(ctx, id)
	if err != nil {
		return RemoteTarget{}, err
	}
	if author := valueString(value["author"]); author != "" && !strings.EqualFold(author, c.username) {
		return RemoteTarget{}, errors.New("CNBlogs post belongs to a different account")
	}
	post := cnBlogsPostFromMap(value)
	if post.ID != id {
		return RemoteTarget{}, errors.New("CNBlogs returned a different post ID")
	}
	if reference.RemoteState != "" && post.RemoteState != reference.RemoteState {
		return RemoteTarget{}, errors.New("CNBlogs post state does not match the requested target state")
	}
	return cnBlogsRemoteTarget(c.username, post), nil
}

func (c *cnBlogsAdapter) InspectTarget(ctx context.Context, target RemoteTarget) (RemoteSnapshot, error) {
	id := target.RemoteDraftID
	if id == "" {
		id = target.RemoteArticleID
	}
	if !cnBlogsNumericID.MatchString(id) {
		return RemoteSnapshot{}, errors.New("invalid CNBlogs post ID")
	}
	value, err := c.fetchPost(ctx, id)
	if err != nil {
		return RemoteSnapshot{}, err
	}
	post := cnBlogsPostFromMap(value)
	return RemoteSnapshot{RemoteTarget: cnBlogsRemoteTarget(c.username, post), Fields: value}, nil
}

func (c *cnBlogsAdapter) Prepare(ctx context.Context, target RemoteTarget, input DraftInput) (PrepareResult, error) {
	if target.RemoteState == "published" || target.RemoteArticleID != "" {
		return PrepareResult{
			PreviewURL: target.PublicURL, PreparedHash: input.ContentHash,
			PrepareMode: "local-preview", RemoteState: "published",
			RemoteUpdatedAt: target.RemoteUpdatedAt, RemoteVersion: target.RemoteVersion,
		}, nil
	}
	var result DraftResult
	var err error
	if target.RemoteDraftID != "" {
		result, err = c.UpdateDraft(ctx, DraftRef{ID: target.RemoteDraftID, URL: target.EditURL}, input)
	} else {
		result, err = c.CreateDraft(ctx, input)
	}
	if err != nil {
		return PrepareResult{}, err
	}
	id := result.ID
	if id == "" {
		id = target.RemoteDraftID
	}
	return PrepareResult{
		RemoteDraftID: id, EditURL: cnBlogsEditURL(id), PreparedHash: input.ContentHash,
		PrepareMode: "remote-draft", RemoteState: "draft",
	}, nil
}

func (c *cnBlogsAdapter) PublishPrepared(ctx context.Context, target RemoteTarget, input DraftInput) (PublishResult, error) {
	if target.RemoteState == "published" || target.RemoteArticleID != "" {
		result, _, _, err := cnBlogsPublishPublished(ctx, c, target, input, "")
		return result, err
	}
	if strings.TrimSpace(target.RemoteDraftID) == "" {
		return PublishResult{}, platformError(ErrValidation, c.ID(), "publish-draft", 0, "remote draft id is missing; create or update the draft first", false)
	}
	return c.PublishDraft(ctx, DraftRef{ID: target.RemoteDraftID, URL: target.EditURL}, input)
}

func cnBlogsPublishPublished(ctx context.Context, adapter *cnBlogsAdapter, target RemoteTarget, input DraftInput, publishedHash string) (PublishResult, RemoteTarget, bool, error) {
	postID := strings.TrimSpace(target.RemoteArticleID)
	if postID == "" {
		postID = strings.TrimSpace(target.RemoteDraftID)
	}
	if postID == "" {
		return PublishResult{}, RemoteTarget{}, false, platformError(ErrValidation, "cnblogs", "update-published", 0, "a verified published target is required", false)
	}
	base, err := adapter.fetchPost(ctx, postID)
	if err != nil {
		return PublishResult{}, RemoteTarget{}, false, err
	}
	if author := valueString(base["author"]); author != "" && !strings.EqualFold(author, adapter.username) {
		return PublishResult{}, RemoteTarget{}, false, platformError(ErrValidation, "cnblogs", "binding", 0, "post belongs to a different CNBlogs account", false)
	}
	if published, _ := base["isPublished"].(bool); !published {
		return PublishResult{}, RemoteTarget{}, false, platformError(ErrValidation, "cnblogs", "update-published", 0, "remote post is no longer published", false)
	}
	remoteUpdatedAt := valueString(base["dateUpdated"])
	if target.RemoteUpdatedAt == "" || remoteUpdatedAt == "" || target.RemoteUpdatedAt != remoteUpdatedAt {
		return PublishResult{}, RemoteTarget{}, false, platformError(ErrValidation, "cnblogs", "update-published", 0, "remote post changed or has no verified baseline; verify the binding again", false)
	}
	if input.ContentHash != "" && publishedHash == input.ContentHash {
		updated := cnBlogsRemoteTarget(adapter.username, cnBlogsPostFromMap(base))
		return PublishResult{URL: updated.PublicURL}, updated, true, nil
	}
	decoded, err := adapter.save(ctx, postID, input, true, true)
	if err != nil {
		return PublishResult{}, RemoteTarget{}, false, err
	}
	if returned := valueString(decoded["id"]); returned != "" && returned != postID {
		return PublishResult{}, RemoteTarget{}, false, platformError(ErrUpstream, "cnblogs", "update-published", 0, "CNBlogs returned a different post ID", false)
	}
	updatedValue, err := adapter.fetchPost(ctx, postID)
	if err != nil {
		return PublishResult{}, RemoteTarget{}, false, err
	}
	if published, _ := updatedValue["isPublished"].(bool); !published {
		return PublishResult{}, RemoteTarget{}, false, platformError(ErrUpstream, "cnblogs", "update-published", 0, "post update was not published", false)
	}
	updated := cnBlogsRemoteTarget(adapter.username, cnBlogsPostFromMap(updatedValue))
	if updated.PublicURL == "" {
		updated.PublicURL = valueString(base["url"])
	}
	return PublishResult{URL: updated.PublicURL}, updated, false, nil
}
