package com.example.CityMapper.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Controller
public class MapController {

    @GetMapping("/showMap")
    public String index() {
        return "index";
    }
}
