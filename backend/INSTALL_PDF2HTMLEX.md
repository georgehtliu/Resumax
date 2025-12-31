# Installing pdf2htmlEX

pdf2htmlEX is required for high-fidelity HTML rendering of resumes. 

**⚠️ Important:** pdf2htmlEX has compatibility issues with newer Poppler versions from Homebrew.

## Option 1: Use Docker (Recommended for macOS)

See [INSTALL_PDF2HTMLEX_DOCKER.md](INSTALL_PDF2HTMLEX_DOCKER.md) for detailed instructions.

**Quick start:**
```bash
cd backend
docker build -f Dockerfile.pdf2htmlex -t pdf2htmlex:local .
```

Then set in `backend/.env`:
```
PDF2HTMLEX_USE_DOCKER=true
```

## Option 2: Build from Source on macOS (Complex - Compatibility Issues)

**Note:** pdf2htmlEX has compatibility issues with newer versions of Poppler from Homebrew. The source code expects an older Poppler API structure.

### Recommended: Use MacPorts (if available)
```bash
# Install MacPorts first, then:
sudo port install pdf2htmlex
```

### Alternative: Build with Compatible Poppler

If you need to build from source, you may need to build Poppler from source first to match pdf2htmlEX's expectations, or patch the source code. This is complex and time-consuming.

The provided `QUICK_INSTALL_PDF2HTMLEX.sh` script attempts to build from source but may fail due to Poppler version incompatibilities.

3. Verify installation:
```bash
pdf2htmlEX --version
```

4. **Do NOT** set `PDF2HTMLEX_USE_DOCKER` in your `.env` file (or set it to `false`)

## Option 2: Use Docker (Linux/Production)

If you're on Linux or deploying to production, you can build the Docker image:

```bash
cd backend
docker build -f Dockerfile.pdf2htmlex -t pdf2htmlex:local .
```

Then set in your `.env`:
```
PDF2HTMLEX_USE_DOCKER=true
```

**Note:** The Docker image must be built locally as pre-built images are not available.

**Note:** The system requires pdf2htmlEX - there is no fallback renderer. Make sure pdf2htmlEX is installed and accessible in your PATH.

## Troubleshooting

- **"pdf2htmlEX executable not found"**: Make sure pdf2htmlEX is in your PATH, or use Docker
- **Docker build fails**: The Dockerfile may need updates for newer Ubuntu versions. Try building from source instead.
- **macOS build issues**: Make sure you have Xcode Command Line Tools installed: `xcode-select --install`

