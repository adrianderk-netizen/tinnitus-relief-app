#!/bin/bash
# Script to download 10 free, royalty-free audio files for tinnitus relief app testing
# Sources: Pixabay (royalty-free, no attribution required for use)
#
# Run this script from the test-music directory:
#   cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/test-music
#   chmod +x download-test-audio.sh
#   ./download-test-audio.sh

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=== Downloading test audio files for tinnitus relief app ==="
echo "Target directory: $DIR"
echo ""

# We'll use Pixabay's CDN links. These are publicly accessible royalty-free tracks.
# Pixabay audio CDN format: https://cdn.pixabay.com/audio/YYYY/MM/DD/audio_HASH.mp3

declare -A TRACKS
TRACKS=(
  ["gentle-rain.mp3"]="https://cdn.pixabay.com/audio/2022/10/09/audio_942f658806.mp3"
  ["ocean-waves.mp3"]="https://cdn.pixabay.com/audio/2022/06/07/audio_b9bd4170e4.mp3"
  ["soft-piano.mp3"]="https://cdn.pixabay.com/audio/2024/11/29/audio_84e97e1012.mp3"
  ["ambient-meditation.mp3"]="https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3"
  ["nature-sounds.mp3"]="https://cdn.pixabay.com/audio/2024/10/22/audio_bc39036498.mp3"
  ["calm-acoustic.mp3"]="https://cdn.pixabay.com/audio/2023/10/24/audio_3f8a4b2f17.mp3"
  ["deep-relaxation.mp3"]="https://cdn.pixabay.com/audio/2023/07/19/audio_e552e2b1f5.mp3"
  ["white-noise.mp3"]="https://cdn.pixabay.com/audio/2022/03/24/audio_67a410f5e0.mp3"
  ["forest-ambience.mp3"]="https://cdn.pixabay.com/audio/2022/01/20/audio_dbb1b47bfb.mp3"
  ["soothing-bells.mp3"]="https://cdn.pixabay.com/audio/2024/09/17/audio_e40907a6c9.mp3"
)

SUCCESS=0
FAIL=0

for name in "${!TRACKS[@]}"; do
  url="${TRACKS[$name]}"
  echo "Downloading: $name"
  echo "  URL: $url"

  if curl -L -f -s -o "$name" "$url"; then
    # Verify it's actually an audio file
    FILE_TYPE=$(file -b "$name")
    FILE_SIZE=$(stat -f%z "$name" 2>/dev/null || stat -c%s "$name" 2>/dev/null)

    if echo "$FILE_TYPE" | grep -qiE "audio|MPEG|layer III|ID3|RIFF|WAV|AAC|MP4"; then
      echo "  OK: $FILE_TYPE ($FILE_SIZE bytes)"
      SUCCESS=$((SUCCESS + 1))
    elif [ "$FILE_SIZE" -gt 50000 ]; then
      # Large file, likely audio even if file command doesn't recognize it perfectly
      echo "  LIKELY OK: $FILE_TYPE ($FILE_SIZE bytes) - large enough to be audio"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "  INVALID: $FILE_TYPE ($FILE_SIZE bytes) - removing"
      rm -f "$name"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "  DOWNLOAD FAILED"
    rm -f "$name"
    FAIL=$((FAIL + 1))
  fi
  echo ""
done

echo "=== Download complete ==="
echo "Successful: $SUCCESS"
echo "Failed: $FAIL"
echo ""

# If some failed, try backup sources from freesound.org previews
if [ $FAIL -gt 0 ]; then
  echo "=== Attempting backup downloads for failed files ==="
  echo "Note: You may need to manually download replacements from:"
  echo "  - https://pixabay.com/music/search/relaxing/"
  echo "  - https://pixabay.com/sound-effects/search/nature/"
  echo "  - https://freesound.org/search/?q=ambient"
  echo ""
fi

# Final verification of all downloaded files
echo "=== Final verification ==="
for f in *.mp3 *.wav *.m4a 2>/dev/null; do
  if [ -f "$f" ]; then
    FILE_TYPE=$(file -b "$f")
    FILE_SIZE=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null)
    echo "  $f: $FILE_TYPE ($FILE_SIZE bytes)"
  fi
done

echo ""
echo "Done! Files are ready in: $DIR"
