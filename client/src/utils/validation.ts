export const isValidUrl = (url: string, platform: string) => {
  try {
    const parsedUrl = new URL(url);
    if (platform === 'instagram' && !parsedUrl.hostname.includes('instagram.com')) {
      return false;
    }
    if (
      platform === 'twitter' &&
      !['twitter.com', 'x.com'].some((validDomain) => parsedUrl.hostname.includes(validDomain))
    ) {
      return false;
    }
    if (platform === 'facebook' && !parsedUrl.hostname.includes('facebook.com')) {
      return false;
    }
    if (platform === 'linkedin' && !parsedUrl.hostname.includes('linkedin.com')) {
      return false;
    }
    if (platform === 'youtube' && !parsedUrl.hostname.includes('youtube.com')) {
      return false;
    }
    if (platform === 'tiktok' && !parsedUrl.hostname.includes('tiktok.com')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
