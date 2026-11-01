import { describe, expect, it } from 'vitest';
import { canOptimizeImage, optimizedImageProps } from './images';

describe('canOptimizeImage', () => {
  it('optimises local and allow-listed hosts', () => {
    expect(canOptimizeImage('/images/team/austin.png')).toBe(true);
    expect(canOptimizeImage('https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg')).toBe(true);
    expect(canOptimizeImage('https://images.unsplash.com/photo-1')).toBe(true);
  });

  it('passes through unknown, insecure or inline sources', () => {
    expect(canOptimizeImage('https://cdn.example.com/a.jpg')).toBe(false);
    expect(canOptimizeImage('http://images.unsplash.com/photo-1')).toBe(false);
    expect(canOptimizeImage('//evil.com/a.jpg')).toBe(false);
    expect(canOptimizeImage('blob:http://localhost/abc')).toBe(false);
    expect(canOptimizeImage('not a url')).toBe(false);
    expect(canOptimizeImage(undefined)).toBe(false);
  });

  it('builds next/image props', () => {
    expect(optimizedImageProps('https://cdn.example.com/a.jpg')).toEqual({ src: 'https://cdn.example.com/a.jpg', unoptimized: true });
  });
});
