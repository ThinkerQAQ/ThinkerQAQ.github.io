package compiler

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func articleRoot(contentRoot, language string) string {
	root := filepath.Join(contentRoot, "src", "content", "articles")
	if language == "en" {
		return filepath.Join(root, "en")
	}
	return root
}

func SourceFile(contentRoot, slug, language string) (string, error) {
	slug = strings.Trim(strings.TrimSpace(strings.ReplaceAll(slug, "\\", "/")), "/")
	if slug == "" {
		return "", fmt.Errorf("article slug is required")
	}
	parts := strings.Split(slug, "/")
	for _, part := range parts {
		if part == "" || part == "." || part == ".." {
			return "", fmt.Errorf("invalid article slug: %s", slug)
		}
	}
	root := articleRoot(contentRoot, language)
	path := filepath.Join(append([]string{root}, parts...)...) + ".md"
	relative, err := filepath.Rel(root, path)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("invalid article slug: %s", slug)
	}
	return path, nil
}

func LoadArticle(contentRoot, slug, language string) (Article, string, error) {
	path, err := SourceFile(contentRoot, slug, language)
	if err != nil {
		return Article{}, "", err
	}
	payload, err := os.ReadFile(path)
	if err != nil {
		return Article{}, "", err
	}
	article, err := ParseArticle(string(payload), path)
	if err != nil {
		return Article{}, "", err
	}
	return article, path, nil
}

func PublishedSlugs(contentRoot, language string) ([]string, error) {
	root := articleRoot(contentRoot, language)
	result := []string{}
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if language != "en" && path != root && entry.Name() == "en" {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.EqualFold(filepath.Ext(entry.Name()), ".md") {
			return nil
		}
		payload, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		article, err := ParseArticle(string(payload), path)
		if err != nil {
			return err
		}
		if article.Status != "published" {
			return nil
		}
		relative, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		slug := strings.TrimSuffix(filepath.ToSlash(relative), filepath.Ext(relative))
		result = append(result, slug)
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(result)
	return result, nil
}
