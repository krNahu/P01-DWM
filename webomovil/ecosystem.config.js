module.exports = {
  apps : [
    {
      name: "casino-backend",
      script: "./backend/server.js",
      env: {
        PORT: 3000,
      }
    },
    {
      name: "casino-frontend",
      script: "./frontend/index.js",
      env: {
        PORT: 80,
        BACKEND_URL: "http://54.163.109.159:3000/api" 
      }
    }
  ]
};