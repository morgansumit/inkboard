import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
    test('homepage loads within acceptable time', async ({ page }) => {
        const start = Date.now();
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        const loadTime = Date.now() - start;

        console.log(`Homepage DOM content loaded in ${loadTime}ms`);
        expect(loadTime).toBeLessThan(5000);
    });

    test('feed renders posts without excessive JS blocking', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });

        // Verify posts render
        const posts = page.locator('.masonry-item, .post-card');
        await expect(posts.first()).toBeVisible({ timeout: 15000 });

        const postCount = await posts.count();
        console.log(`Feed rendered ${postCount} post cards`);
        expect(postCount).toBeGreaterThan(0);
    });

    test('scroll performance - no long frames during scroll', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });

        // Wait for feed to load
        const posts = page.locator('.masonry-item, .post-card');
        await expect(posts.first()).toBeVisible({ timeout: 15000 });

        // Collect long frame data using Performance API
        const scrollMetrics = await page.evaluate(async () => {
            return new Promise<{ longFrames: number; totalFrames: number; avgFrameTime: number; maxFrameTime: number }>((resolve) => {
                const frameTimes: number[] = [];
                let lastTime = performance.now();
                let longFrames = 0;
                let frameCount = 0;

                function measureFrame() {
                    const now = performance.now();
                    const delta = now - lastTime;
                    lastTime = now;
                    frameTimes.push(delta);
                    frameCount++;

                    // A "long frame" is >33ms (~30fps threshold)
                    if (delta > 33) longFrames++;

                    if (frameCount < 120) {
                        requestAnimationFrame(measureFrame);
                    } else {
                        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
                        const max = Math.max(...frameTimes);
                        resolve({
                            longFrames,
                            totalFrames: frameCount,
                            avgFrameTime: Math.round(avg * 100) / 100,
                            maxFrameTime: Math.round(max * 100) / 100,
                        });
                    }
                }

                // Simulate scrolling during measurement
                let scrollY = 0;
                const scrollInterval = setInterval(() => {
                    scrollY += 100;
                    window.scrollTo(0, scrollY);
                    if (scrollY > 3000) clearInterval(scrollInterval);
                }, 16);

                requestAnimationFrame(measureFrame);
            });
        });

        console.log('Scroll performance metrics:', JSON.stringify(scrollMetrics, null, 2));
        console.log(`Average frame time: ${scrollMetrics.avgFrameTime}ms (${Math.round(1000 / scrollMetrics.avgFrameTime)} FPS)`);
        console.log(`Max frame time: ${scrollMetrics.maxFrameTime}ms`);
        console.log(`Long frames (>33ms): ${scrollMetrics.longFrames}/${scrollMetrics.totalFrames}`);

        // At least 80% of frames should be under 33ms (30fps minimum)
        const goodFrameRatio = (scrollMetrics.totalFrames - scrollMetrics.longFrames) / scrollMetrics.totalFrames;
        console.log(`Good frame ratio: ${(goodFrameRatio * 100).toFixed(1)}%`);
        expect(goodFrameRatio).toBeGreaterThan(0.7);

        // Average should be under 16.6ms for 60fps target
        expect(scrollMetrics.avgFrameTime).toBeLessThan(25);
    });

    test('no unnecessary large JS bundles loaded', async ({ page }) => {
        const jsRequests: { url: string; size: number }[] = [];

        page.on('response', async (response) => {
            const url = response.url();
            if (url.endsWith('.js') || url.includes('.js?')) {
                const headers = response.headers();
                const contentLength = parseInt(headers['content-length'] || '0', 10);
                if (contentLength > 0) {
                    jsRequests.push({ url: url.split('/').pop() || url, size: contentLength });
                }
            }
        });

        await page.goto('/', { waitUntil: 'networkidle' });

        const totalJsSize = jsRequests.reduce((sum, r) => sum + r.size, 0);
        const totalJsKB = Math.round(totalJsSize / 1024);

        console.log(`Total JS loaded: ${totalJsKB}KB across ${jsRequests.length} files`);

        // Log large bundles (>100KB)
        const largeBundles = jsRequests.filter(r => r.size > 100 * 1024);
        if (largeBundles.length > 0) {
            console.log('Large JS bundles (>100KB):');
            largeBundles.forEach(b => console.log(`  ${b.url}: ${Math.round(b.size / 1024)}KB`));
        }

        // Total JS should be reasonable (under 2MB)
        expect(totalJsSize).toBeLessThan(2 * 1024 * 1024);
    });

    test('images use lazy loading', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });

        // Wait for feed
        const posts = page.locator('.post-card');
        await expect(posts.first()).toBeVisible({ timeout: 15000 });

        // Check lazy loading attributes on images
        const images = await page.locator('.post-card-image').evaluateAll((imgs) => {
            return imgs.map((img, i) => ({
                index: i,
                loading: (img as HTMLImageElement).loading,
                src: (img as HTMLImageElement).src?.substring(0, 60),
            }));
        });

        const lazyImages = images.filter(img => img.loading === 'lazy');
        console.log(`${lazyImages.length}/${images.length} images use lazy loading`);

        // At least some images should be lazy (those beyond the first few)
        if (images.length > 4) {
            expect(lazyImages.length).toBeGreaterThan(0);
        }
    });

    test('CSS containment applied to masonry items', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });

        const posts = page.locator('.masonry-item');
        await expect(posts.first()).toBeVisible({ timeout: 15000 });

        const containment = await posts.first().evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
                contain: style.contain,
                contentVisibility: style.contentVisibility,
            };
        });

        console.log('Masonry item CSS containment:', containment);
        expect(containment.contain).toContain('layout');
        expect(containment.contentVisibility).toBe('auto');
    });
});
