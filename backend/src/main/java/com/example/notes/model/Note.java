package com.example.notes.model;

public class Note {

    private String id;
    private String content = ""; // 🔥 prevents null crash
    private long lastUpdated;
    private String status;

    public Note() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getContent() {
        return content == null ? "" : content; // 🔥 extra safety
    }

    public void setContent(String content) {
        this.content = content;
    }

    public long getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}