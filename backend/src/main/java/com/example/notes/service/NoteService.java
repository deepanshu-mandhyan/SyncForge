package com.example.notes.service;

import com.example.notes.model.Note;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class NoteService {

    private final Map<String, Note> database = new HashMap<>();

    public List<Map<String, Object>> sync(List<Note> clientNotes) {

        List<Map<String, Object>> response = new ArrayList<>();

        if (clientNotes == null) return response;

        for (Note clientNote : clientNotes) {

            if (clientNote == null || clientNote.getId() == null) continue;

            Note serverNote = database.get(clientNote.getId());
            Map<String, Object> result = new HashMap<>();

            // NEW NOTE
            if (serverNote == null) {
                database.put(clientNote.getId(), clientNote);

                result.put("status", "SYNCED");
                result.put("note", clientNote);
            }
            else {

                long clientTime = clientNote.getLastUpdated();
                long serverTime = serverNote.getLastUpdated();

                // CLIENT IS NEWER
                if (clientTime > serverTime) {

                    database.put(clientNote.getId(), clientNote);

                    result.put("status", "SYNCED");
                    result.put("note", clientNote);
                }

                // SERVER IS NEWER
                else if (serverTime > clientTime) {

                    result.put("status", "UPDATED_FROM_SERVER");
                    result.put("note", serverNote);
                }

                // SAME
                else {
                    result.put("status", "SYNCED");
                    result.put("note", serverNote);
                }
            }

            response.add(result);
        }

        return response;
    }

    public List<Note> getAll() {
        return new ArrayList<>(database.values());
    }
}