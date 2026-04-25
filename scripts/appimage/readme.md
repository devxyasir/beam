# Beam AppImage Creation Script

This script automates the process of creating an AppImage for the Beam Editor using Docker. It works on macOS and Linux platforms.

## Prerequisites

### macOS
*   Docker Desktop for Mac must be installed and running.
*   `wget` must be installed (e.g., via `brew install wget`).

### Linux
*   Docker must be installed and running.
*   `wget` must be installed.
*   `privileged` mode must be supported by your Docker installation.

## Usage

1.  Open your terminal and navigate to the `scripts/appimage/` directory.
2.  Make sure the `create_appimage.sh` script is executable:
    ```bash
    chmod +x create_appimage.sh
    ```
3.  Run the script:
    ```bash
    ./create_appimage.sh
    ```

## How It Works

The script performs the following steps:

1.  **Platform Detection:** Identifies if it's running on macOS or Linux.
2.  **Environment Check:** Verifies that Docker is installed and running.
3.  **Buildx Check:** Installs Docker Buildx if it's not already available.
4.  **AppImageKit Download:** Downloads `appimagetool` if it doesn't exist locally.
5.  **Docker Build:**
    *   Creates a `Dockerfile.build` based on Ubuntu 20.04.
    *   Installs necessary runtime dependencies (e.g., FUSE, GTK, NSS).
    *   Builds a Docker image named `beam-appimage-builder`.
6.  **AppImage Creation (Inside Docker Container):**
    *   Creates the `BeamApp.AppDir` structure.
    *   Copies all necessary files from the current directory into the AppDir.
    *   Copies `beam.desktop` and `beam.png`.
    *   Creates the `AppRun` entry point script.
    *   Strips symbols from the binary to reduce size.
    *   Runs `appimagetool` to generate the final AppImage.
7.  **Output:**
    *   The generated AppImage will be named `Beam-x86_64.AppImage` in the current directory.
    *   Cleans up the `BeamApp.AppDir` and other temporary build files.

## Troubleshooting

### Docker Permissions
If you encounter permission errors with Docker on Linux, ensure your user is part of the `docker` group:
```bash
sudo usermod -aG docker $USER
```
Then log out and back in.

### FUSE Error
If you see an error related to FUSE when running the script on Linux, you may need to install `libfuse2`:
```bash
sudo apt-get install libfuse2
```

### Privileged Mode
The script uses `docker run --privileged` because `appimagetool` requires it to mount the AppDir. If your environment doesn't allow privileged containers, the script may fail.
