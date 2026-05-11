/**
 * OpenCV Helper for SICON Image Recognition
 */

export const waitForCV = () => {
  return new Promise((resolve) => {
    if (window.cv && window.cv.onRuntimeInitialized) {
      resolve();
    } else {
      window.Module = {
        onRuntimeInitialized: () => {
          resolve();
        }
      };
    }
  });
};

export const extractFeatures = (imgElement) => {
  if (!window.cv) {
    throw new Error('OpenCV.js not loaded yet');
  }
  const cv = window.cv;
  
  // Create a temporary canvas to ensure the image is drawable
  const canvas = document.createElement('canvas');
  canvas.width = imgElement.width;
  canvas.height = imgElement.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgElement, 0, 0);

  let src = cv.imread(canvas);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  let orb = new cv.ORB();
  let keypoints = new cv.KeyPointVector();
  let descriptors = new cv.Mat();
  
  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

  if (descriptors.rows < 10) {
    src.delete(); gray.delete(); orb.delete(); keypoints.delete(); descriptors.delete();
    throw new Error('Image too simple. Not enough unique features found. Try an image with more detail.');
  }

  // Convert descriptors to a serializable format (Array)
  const descArray = [];
  const rows = descriptors.rows;
  const cols = descriptors.cols;
  const data = descriptors.data;

  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(data[i * cols + j]);
    }
    descArray.push(row);
  }

  // Cleanup
  src.delete();
  gray.delete();
  orb.delete();
  keypoints.delete();
  descriptors.delete();
  
  return { descriptors: descArray, rows, cols };
};

export const matchFeatures = (queryDescriptors, database) => {
  const cv = window.cv;
  if (!queryDescriptors || queryDescriptors.rows === 0) return null;

  const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
  let bestMatch = null;
  let maxMatches = 0;

  for (const entry of database) {
    if (!entry.descriptors || entry.descriptors.length === 0) continue;

    // Convert stored array back to cv.Mat
    const dbMat = cv.matFromArray(entry.descriptors.length, 32, cv.CV_8U, entry.descriptors.flat());
    
    let matches = new cv.DMatchVector();
    bf.match(queryDescriptors, dbMat, matches);

    // Filter good matches
    let goodMatchesCount = 0;
    for (let i = 0; i < matches.size(); i++) {
      if (matches.get(i).distance < 50) { // Threshold for ORB
        goodMatchesCount++;
      }
    }

    if (goodMatchesCount > maxMatches && goodMatchesCount > 20) { // Minimum consensus
      maxMatches = goodMatchesCount;
      bestMatch = entry;
    }

    dbMat.delete();
    matches.delete();
  }

  bf.delete();
  return bestMatch;
};
