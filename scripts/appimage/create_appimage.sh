#!/bin/bash

# Exit on error
set -e

# Check platform
platform=$(uname)

if [[ "$platform" == "Darwin" ]]; then
    echo "Running on macOS. Note that the AppImage created will only work on Linux systems."
    if ! command -v docker &> /dev/null; then
        echo "Docker Desktop for Mac is not installed. Please install it from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
elif [[ "$platform" == "Linux" ]]; then
    echo "Running on Linux. Proceeding with AppImage creation..."
else
    echo "This script is intended to run on macOS or Linux. Current platform: $platform"
    exit 1
fi

# Enable BuildKit
export DOCKER_BUILDKIT=1

BUILD_IMAGE_NAME="beam-appimage-builder"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Check and install Buildx if needed
if ! docker buildx version >/dev/null 2>&1; then
    echo "Installing Docker Buildx..."
    mkdir -p ~/.docker/cli-plugins/
    curl -SL https://github.com/docker/buildx/releases/download/v0.13.1/buildx-v0.13.1.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx
    chmod +x ~/.docker/cli-plugins/docker-buildx
fi

# Download appimagetool if not present
if [ ! -f "appimagetool" ]; then
    echo "Downloading appimagetool..."
    wget -O appimagetool "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
    chmod +x appimagetool
fi

# Delete any existing AppImage to avoid bloating the build
rm -f Beam-x86_64.AppImage

# Create build Dockerfile
echo "Creating build Dockerfile..."
cat > Dockerfile.build << 'EOF'
# syntax=docker/dockerfile:1
FROM ubuntu:20.04

# Install required dependencies
RUN apt-get update && apt-get install -y \
    libfuse2 \
    libglib2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libasound2 \
    libdrm2 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
EOF

# Create .dockerignore file
echo "Creating .dockerignore file..."
cat > .dockerignore << EOF
Dockerfile.build
.dockerignore
.git
.gitignore
.DS_Store
*~
*.swp
*.swo
*.tmp
*.bak
*.log
*.err
node_modules/
venv/
*.egg-info/
*.tox/
dist/
EOF

# Build Docker image without cache
echo "Building Docker image (no cache)..."
docker build --no-cache -t "$BUILD_IMAGE_NAME" -f Dockerfile.build .

# Create AppImage using local appimagetool
echo "Creating AppImage..."
docker run --rm --privileged -v "$(pwd):/app" "$BUILD_IMAGE_NAME" bash -c '
cd /app && \
rm -rf BeamApp.AppDir && \
mkdir -p BeamApp.AppDir/usr/bin BeamApp.AppDir/usr/lib BeamApp.AppDir/usr/share/applications && \
find . -maxdepth 1 ! -name BeamApp.AppDir ! -name "." ! -name ".." -exec cp -r {} BeamApp.AppDir/usr/bin/ \; && \
cp beam.png BeamApp.AppDir/ && \
echo "[Desktop Entry]" > BeamApp.AppDir/beam.desktop && \
echo "Name=Beam" >> BeamApp.AppDir/beam.desktop && \
echo "Comment=Open source AI code editor." >> BeamApp.AppDir/beam.desktop && \
echo "GenericName=Text Editor" >> BeamApp.AppDir/beam.desktop && \
echo "Exec=beam %F" >> BeamApp.AppDir/beam.desktop && \
echo "Icon=beam" >> BeamApp.AppDir/beam.desktop && \
echo "Type=Application" >> BeamApp.AppDir/beam.desktop && \
echo "StartupNotify=false" >> BeamApp.AppDir/beam.desktop && \
echo "StartupWMClass=Beam" >> BeamApp.AppDir/beam.desktop && \
echo "Categories=TextEditor;Development;IDE;" >> BeamApp.AppDir/beam.desktop && \
echo "MimeType=application/x-beam-workspace;" >> BeamApp.AppDir/beam.desktop && \
echo "Keywords=beam;" >> BeamApp.AppDir/beam.desktop && \
echo "Actions=new-empty-window;" >> BeamApp.AppDir/beam.desktop && \
echo "[Desktop Action new-empty-window]" >> BeamApp.AppDir/beam.desktop && \
echo "Name=New Empty Window" >> BeamApp.AppDir/beam.desktop && \
echo "Name[de]=Neues leeres Fenster" >> BeamApp.AppDir/beam.desktop && \
echo "Name[es]=Nueva ventana vacía" >> BeamApp.AppDir/beam.desktop && \
echo "Name[fr]=Nouvelle fenêtre vide" >> BeamApp.AppDir/beam.desktop && \
echo "Name[it]=Nuova finestra vuota" >> BeamApp.AppDir/beam.desktop && \
echo "Name[ja]=新しい空のウィンドウ" >> BeamApp.AppDir/beam.desktop && \
echo "Name[ko]=새 빈 창" >> BeamApp.AppDir/beam.desktop && \
echo "Name[ru]=Новое пустое окно" >> BeamApp.AppDir/beam.desktop && \
echo "Name[zh_CN]=新建空窗口" >> BeamApp.AppDir/beam.desktop && \
echo "Name[zh_TW]=開新空視窗" >> BeamApp.AppDir/beam.desktop && \
echo "Exec=beam --new-window %F" >> BeamApp.AppDir/beam.desktop && \
echo "Icon=beam" >> BeamApp.AppDir/beam.desktop && \
chmod +x BeamApp.AppDir/beam.desktop && \
cp BeamApp.AppDir/beam.desktop BeamApp.AppDir/usr/share/applications/ && \
echo "[Desktop Entry]" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "Name=Beam - URL Handler" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "Comment=Open source AI code editor." > BeamApp.AppDir/beam-url-handler.desktop && \
echo "GenericName=Text Editor" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "Exec=beam --open-url %U" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "Icon=beam" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "Type=Application" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "NoDisplay=true" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "StartupNotify=true" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "Categories=Utility;TextEditor;Development;IDE;" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "MimeType=x-scheme-handler/beam;" > BeamApp.AppDir/beam-url-handler.desktop && \
echo "Keywords=beam;" > BeamApp.AppDir/beam-url-handler.desktop && \
chmod +x BeamApp.AppDir/beam-url-handler.desktop && \
cp BeamApp.AppDir/beam-url-handler.desktop BeamApp.AppDir/usr/share/applications/ && \
echo "#!/bin/bash" > BeamApp.AppDir/AppRun && \
echo "HERE=\$(dirname \"\$(readlink -f \"\${0}\")\")" >> BeamApp.AppDir/AppRun && \
echo "export PATH=\${HERE}/usr/bin:\${PATH}" >> BeamApp.AppDir/AppRun && \
echo "export LD_LIBRARY_PATH=\${HERE}/usr/lib:\${LD_LIBRARY_PATH}" >> BeamApp.AppDir/AppRun && \
echo "exec \${HERE}/usr/bin/beam --no-sandbox \"\$@\"" >> BeamApp.AppDir/AppRun && \
chmod +x BeamApp.AppDir/AppRun && \
chmod -R 755 BeamApp.AppDir && \

# Strip unneeded symbols from the binary to reduce size
strip --strip-unneeded BeamApp.AppDir/usr/bin/beam

ls -la BeamApp.AppDir/ && \
ARCH=x86_64 ./appimagetool -n BeamApp.AppDir Beam-x86_64.AppImage
'

# Clean up
rm -rf BeamApp.AppDir .dockerignore appimagetool

echo "AppImage creation complete! Your AppImage is: Beam-x86_64.AppImage"
