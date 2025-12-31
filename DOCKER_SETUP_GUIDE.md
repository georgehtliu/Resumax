# Docker Setup Guide for pdf2htmlEX

## Quick Start Checklist

### 1. Start Docker Desktop
- **Look for the Docker icon in your Mac's menu bar** (top right, near the clock)
- If you don't see it, open Docker Desktop from Applications
- **Wait until the icon shows "Docker Desktop is running"** (not "starting...")
- This usually takes 10-30 seconds after opening

### 2. Verify Docker is Working

Open Terminal and run:
```bash
docker ps
```

You should see output like:
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS   PORTS     NAMES
```

If you see "Cannot connect to the Docker daemon", Docker Desktop isn't fully started yet.

### 3. Verify pdf2htmlEX Image Exists

Run:
```bash
docker images | grep pdf2htmlex
```

You should see:
```
pdf2htmlex:local   fd88b10e54f4   1.21GB   ...
```

### 4. Test pdf2htmlEX

Run:
```bash
docker run --rm pdf2htmlex:local pdf2htmlEX --version
```

You should see:
```
pdf2htmlEX version 0.18.8.rc2
```

## Troubleshooting

### Docker Desktop Won't Start
1. Open Docker Desktop from Applications
2. Check if there are any error messages in the Docker Desktop window
3. Try restarting Docker Desktop: Menu → Quit Docker Desktop, then open it again

### "Cannot connect to Docker daemon"
- Docker Desktop is starting but not ready yet
- Wait 30-60 seconds after opening Docker Desktop
- Check the Docker icon in the menu bar - it should be steady (not animating)

### Docker Desktop Keeps Crashing
- Make sure you have enough disk space (Docker needs several GB)
- Check Docker Desktop settings → Resources → make sure enough memory is allocated (at least 2GB)

### Keep Docker Desktop Running
- Docker Desktop needs to be running whenever you want to use pdf2htmlEX
- You can minimize the Docker Desktop window, but don't quit it
- The menu bar icon should always be visible

## After Docker is Running

Once Docker is working, your backend will automatically use it when `PDF2HTMLEX_USE_DOCKER=true` is set in your `.env` file.

Refresh your browser and try the shared resume view again!

