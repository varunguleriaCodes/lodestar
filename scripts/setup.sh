#!/bin/bash

# ASCII art
echo "  _           _           _             "
echo " | |         | |         | |            "
echo " | | ___   __| | ___  ___| |_ __ _ _ __ "
echo " | |/ _ \ / _  |/ _ \/ __| __/ _  |  __|"
echo " | | (_) | (_| |  __/\__ \ || (_| | |   "
echo " |_|\___/ \__ _|\___||___/\__\__ _|_|   "
echo ""

# Declare a log file to capture detailed logs and a temp directory
LOGFILE="$HOME/lodestar-app-temp/logfile.log"
TEMP_DIR="$HOME/lodestar-app-temp"

# Check if the directory exists
if [ -d "$TEMP_DIR" ]; then
    read -p "Directory $TEMP_DIR exists. Do you want to clear it out? (y/n) " -n 1 -r
    echo    # move to a new line
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        rm -rf "$TEMP_DIR"
        echo "Directory $TEMP_DIR has been removed."
    fi
fi

# Create a temporary directory to work from
mkdir -p "$TEMP_DIR"
touch "$LOGFILE"

# Log and print the log file location
echo "Log file is located at: $LOGFILE" | tee -a "$LOGFILE"

# Change to $TEMP_DIR and print a message
cd "$TEMP_DIR" || exit 1
echo "Working from temporary directory: $TEMP_DIR" | tee -a "$LOGFILE"

# Fetch the latest release tag from GitHub
VERSION=$(curl -s "https://api.github.com/repos/ChainSafe/lodestar/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

# Check if VERSION is empty
if [ -z "$VERSION" ]; then
    echo "Failed to fetch the latest version. Exiting." | tee -a "$LOGFILE"
    exit 1
fi

# Log and print a message
echo "Latest version detected: $VERSION" | tee -a "$LOGFILE"

# Detect the operating system and architecture
OS=$(uname -s)
ARCH=$(uname -m)

# Translate architecture to expected format
case $ARCH in
    x86_64)
        ARCH="amd64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    *)
        echo "Unsupported architecture: $ARCH. Exiting." | tee -a "$LOGFILE"
        exit 1
        ;;
esac

# Translate OS to expected format
case $OS in
    Linux)
        PLATFORM="linux-$ARCH"
        ;;
    Darwin)
        PLATFORM="darwin-$ARCH"
        ;;
    *)
        echo "Unsupported operating system: $OS. Exiting." | tee -a "$LOGFILE"
        exit 1
        ;;
esac

# Construct the download URL
URL="https://github.com/ChainSafe/lodestar/releases/download/$VERSION/lodestar-$VERSION-$PLATFORM.tar.gz"

# Log and print a message
echo "Downloading from: $URL" | tee -a "$LOGFILE"

# Download the tarball
if ! wget "$URL" -O "lodestar-$VERSION-$PLATFORM.tar.gz" >> "$LOGFILE" 2>&1; then
    echo "Download failed. Exiting." | tee -a "$LOGFILE"
    exit 1
fi

# Extract the tarball to the temporary directory
if ! tar -xzf "lodestar-$VERSION-$PLATFORM.tar.gz" >> "$LOGFILE" 2>&1; then
    echo "Extraction failed. Exiting." | tee -a "$LOGFILE"
    exit 1
fi

# Log and print a message
echo "Binary extracted to: $TEMP_DIR" | tee -a "$LOGFILE"

# Remove the tarball to clean up
rm "lodestar-$VERSION-$PLATFORM.tar.gz"

# Ask the user if they want to move the binary to /usr/local/bin
read -p "Do you want to move the binary to /usr/local/bin? This will require sudo access. (y/n) " -n 1 -r
echo    # move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    sudo mv "$TEMP_DIR/lodestar" /usr/local/bin/
    echo "Binary moved to /usr/local/bin" | tee -a "$LOGFILE"
    ln -s /usr/local/bin/lodestar "$TEMP_DIR/lodestar"
    echo ""
    echo "You can now run lodestar from anywhere." | tee -a "$LOGFILE"
    echo ""
    echo "To see the menu, execute the following command:" | tee -a "$LOGFILE"
    echo ""
    echo "Do a cd .. && ./lodestar --help" | tee -a "$LOGFILE"
else
    echo ""
    echo "You can navigate to $TEMP_DIR to find and run lodestar." | tee -a "$LOGFILE"
    echo ""
    echo "To see the menu, execute the following commands:" | tee -a "$LOGFILE"
    echo ""
    echo "cd $TEMP_DIR" | tee -a "$LOGFILE"
    echo "chmod +x lodestar" | tee -a "$LOGFILE" 
    echo "Do a cd .. & run ./lodestar --help" | tee -a "$LOGFILE"
fi
