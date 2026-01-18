package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/fratures/internal/api"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := gin.Default()
	api.SetupRoutes(router)

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
