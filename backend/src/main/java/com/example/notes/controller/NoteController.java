package com.example.notes.controller;

import com.example.notes.model.Note;
import com.example.notes.service.NoteService;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping("/sync")
    public List<Map<String, Object>> sync(@RequestBody(required = false) List<Note> notes) {
        if (notes == null) return new ArrayList<>();
        return noteService.sync(notes);
    }

    @GetMapping("/notes")
    public List<Note> getNotes() {
        return noteService.getAll();
    }
}