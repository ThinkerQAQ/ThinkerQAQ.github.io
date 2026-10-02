package bridge

import (
	"encoding/json"
	"strings"
)

func migrateLegacyIndexNowSnapshot() searchInventoryState {
	legacy := loadSearchProviderSnapshot("bing-indexnow-snapshot.json")
	if legacy.Source != "" || legacy.Total > 0 || len(legacy.URLs) > 0 || len(legacy.Fingerprints) > 0 {
		_ = saveIndexNowSnapshot(legacy)
	}
	return legacy
}

func migrateLegacyIndexNowState(data []byte) (searchOperationState, bool) {
	var legacy struct {
		Bing searchOperationState `json:"bing"`
	}
	if json.Unmarshal(data, &legacy) != nil || legacy.Bing.State == "" {
		return searchOperationState{}, false
	}
	return legacy.Bing, true
}

func migrateLegacySearchTask(job *durableTaskJob, stamp string) bool {
	if job == nil || job.Kind != "search" || job.Type != "bing-indexnow" {
		return false
	}
	job.Type = "indexnow-submit"
	job.Title = strings.Replace(job.Title, "Bing", "IndexNow", 1)
	job.UpdatedAt = stamp
	return true
}
