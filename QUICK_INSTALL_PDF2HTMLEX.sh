#!/bin/bash
# Quick install script for pdf2htmlEX on macOS

set -e

echo "Installing pdf2htmlEX dependencies..."

# Handle conflict with pdf2image if it's installed
if brew list pdf2image &>/dev/null; then
    echo "Detected pdf2image installation - unlinking to avoid conflict with poppler..."
    brew unlink pdf2image || true
fi

# Install dependencies
echo "Installing fontforge, cmake, pkg-config (pkgconf), and cairo..."
brew install fontforge cmake pkg-config cairo || {
    # On macOS, pkg-config might be installed as pkgconf
    brew install pkgconf 2>/dev/null || true
}

# Install poppler (handle conflict with pdf2image)
echo "Installing poppler..."
if brew list poppler &>/dev/null; then
    echo "poppler is already installed"
elif brew list pdf2image &>/dev/null; then
    echo "pdf2image detected - unlinking temporarily to install poppler..."
    brew unlink pdf2image 2>/dev/null || true
    brew install poppler
    echo "Note: pdf2image remains unlinked. Relink with: brew link pdf2image (if needed)"
else
    brew install poppler
fi

# Optionally relink pdf2image if it was unlinked
if brew list pdf2image &>/dev/null && ! brew list --linked pdf2image &>/dev/null; then
    echo "Note: pdf2image was unlinked. You can relink it after installation with: brew link pdf2image"
fi

echo ""
echo "Cloning pdf2htmlEX repository..."
cd /tmp
if [ -d "pdf2htmlEX" ]; then
    rm -rf pdf2htmlEX
fi
git clone --recursive https://github.com/pdf2htmlEX/pdf2htmlEX.git
cd pdf2htmlEX/pdf2htmlEX

echo ""
echo "Building pdf2htmlEX (this may take a few minutes)..."
mkdir -p build
cd build
cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local -DCMAKE_POLICY_VERSION_MINIMUM=3.5 ..
make -j$(sysctl -n hw.ncpu)
sudo make install

echo ""
echo "Verifying installation..."
pdf2htmlEX --version

echo ""
echo "✅ pdf2htmlEX installed successfully!"
echo "You can now use the /latex/render-html endpoint in your backend."
