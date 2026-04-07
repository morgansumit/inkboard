# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: post-management.spec.ts >> Admin Post Management >> Admin can login and access admin panel
- Location: tests/post-management.spec.ts:30:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Dashboard Overview' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('heading', { name: 'Dashboard Overview' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e4]:
    - generic [ref=e5]:
      - complementary [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]:
            - img "Purseable" [ref=e9]
            - generic [ref=e10]: Purseable
          - generic [ref=e11]: Admin Panel
        - button "Dashboard" [ref=e12] [cursor=pointer]:
          - img [ref=e13]
          - text: Dashboard
        - button "Business Accounts" [ref=e18] [cursor=pointer]:
          - img [ref=e19]
          - text: Business Accounts
        - button "Ads Management" [ref=e24] [cursor=pointer]:
          - img [ref=e25]
          - text: Ads Management
        - button "Post Management" [ref=e27] [cursor=pointer]:
          - img [ref=e28]
          - text: Post Management
          - img [ref=e31]
        - button "User Management" [ref=e33] [cursor=pointer]:
          - img [ref=e34]
          - text: User Management
        - button "Reports" [ref=e39] [cursor=pointer]:
          - img [ref=e40]
          - text: Reports
        - button "Geo Logs" [ref=e42] [cursor=pointer]:
          - img [ref=e43]
          - text: Geo Logs
        - button "Broadcast Messages" [ref=e46] [cursor=pointer]:
          - img [ref=e47]
          - text: Broadcast Messages
        - generic [ref=e50]:
          - link "Coupons & Deals" [ref=e51] [cursor=pointer]:
            - /url: /admin/coupons
            - img [ref=e52]
            - text: Coupons & Deals
          - link "Legal Policies" [ref=e56] [cursor=pointer]:
            - /url: /admin/policies
            - img [ref=e57]
            - text: Legal Policies
          - button "Sign out" [ref=e59] [cursor=pointer]:
            - img [ref=e60]
            - text: Sign out
          - link "Back to Site" [ref=e63] [cursor=pointer]:
            - /url: /
            - img [ref=e64]
            - text: Back to Site
      - main [ref=e66]:
        - generic [ref=e67]:
          - button "Refresh now" [ref=e68] [cursor=pointer]
          - generic [ref=e69]: Cached at 4:29:09 PM (fresh)
        - generic [ref=e70]:
          - generic [ref=e71]:
            - heading "Post Management" [level=2] [ref=e72]
            - button "+ Create Post" [ref=e73] [cursor=pointer]
          - table [ref=e75]:
            - rowgroup [ref=e76]:
              - row "Title Author Tags Country Status Likes Actions" [ref=e77]:
                - columnheader "Title" [ref=e78]
                - columnheader "Author" [ref=e79]
                - columnheader "Tags" [ref=e80]
                - columnheader "Country" [ref=e81]
                - columnheader "Status" [ref=e82]
                - columnheader "Likes" [ref=e83]
                - columnheader "Actions" [ref=e84]
            - rowgroup [ref=e85]:
              - row "Post to be deleted by author Inkboard Admin Global REMOVED ❤️ 0" [ref=e86]:
                - cell "Post to be deleted by author" [ref=e87]
                - cell "Inkboard Admin" [ref=e88]
                - cell [ref=e89]
                - cell "Global" [ref=e90]
                - cell "REMOVED" [ref=e91]
                - cell "❤️ 0" [ref=e92]
                - cell [ref=e93]:
                  - generic [ref=e94]:
                    - link "View" [ref=e95] [cursor=pointer]:
                      - /url: /post/19c0c49e-b734-4ede-b111-b3505a9c5217
                      - img [ref=e96]
                    - button "Remove" [active] [ref=e99] [cursor=pointer]:
                      - img [ref=e100]
              - row "E2E Test Post for Management Inkboard Admin Global REMOVED ❤️ 0" [ref=e103]:
                - cell "E2E Test Post for Management" [ref=e104]
                - cell "Inkboard Admin" [ref=e105]
                - cell [ref=e106]
                - cell "Global" [ref=e107]
                - cell "REMOVED" [ref=e108]
                - cell "❤️ 0" [ref=e109]
                - cell [ref=e110]:
                  - generic [ref=e111]:
                    - link "View" [ref=e112] [cursor=pointer]:
                      - /url: /post/ecdb9d71-b3f6-49fd-bf1f-3c5f34fb8e45
                      - img [ref=e113]
                    - button "Remove" [ref=e116] [cursor=pointer]:
                      - img [ref=e117]
              - row "Post to be deleted by author Inkboard Admin Global REMOVED ❤️ 0" [ref=e120]:
                - cell "Post to be deleted by author" [ref=e121]
                - cell "Inkboard Admin" [ref=e122]
                - cell [ref=e123]
                - cell "Global" [ref=e124]
                - cell "REMOVED" [ref=e125]
                - cell "❤️ 0" [ref=e126]
                - cell [ref=e127]:
                  - generic [ref=e128]:
                    - link "View" [ref=e129] [cursor=pointer]:
                      - /url: /post/007cc199-9289-4afd-873e-82a21b0a67c9
                      - img [ref=e130]
                    - button "Remove" [ref=e133] [cursor=pointer]:
                      - img [ref=e134]
              - row "E2E Test Post for Management Inkboard Admin Global REMOVED ❤️ 0" [ref=e137]:
                - cell "E2E Test Post for Management" [ref=e138]
                - cell "Inkboard Admin" [ref=e139]
                - cell [ref=e140]
                - cell "Global" [ref=e141]
                - cell "REMOVED" [ref=e142]
                - cell "❤️ 0" [ref=e143]
                - cell [ref=e144]:
                  - generic [ref=e145]:
                    - link "View" [ref=e146] [cursor=pointer]:
                      - /url: /post/3b364a4d-2c24-472f-a25e-fd58db4160b4
                      - img [ref=e147]
                    - button "Remove" [ref=e150] [cursor=pointer]:
                      - img [ref=e151]
              - row "E2E Test Post for Management Inkboard Admin Global REMOVED ❤️ 0" [ref=e154]:
                - cell "E2E Test Post for Management" [ref=e155]
                - cell "Inkboard Admin" [ref=e156]
                - cell [ref=e157]
                - cell "Global" [ref=e158]
                - cell "REMOVED" [ref=e159]
                - cell "❤️ 0" [ref=e160]
                - cell [ref=e161]:
                  - generic [ref=e162]:
                    - link "View" [ref=e163] [cursor=pointer]:
                      - /url: /post/54ab4095-197f-415b-8569-ab4c55dfec0d
                      - img [ref=e164]
                    - button "Remove" [ref=e167] [cursor=pointer]:
                      - img [ref=e168]
              - row "Nitesh Patel niteshpatel259 GB REMOVED ❤️ 0" [ref=e171]:
                - cell "Nitesh Patel" [ref=e172]
                - cell "niteshpatel259" [ref=e173]
                - cell [ref=e174]
                - cell "GB" [ref=e175]
                - cell "REMOVED" [ref=e176]
                - cell "❤️ 0" [ref=e177]
                - cell [ref=e178]:
                  - generic [ref=e179]:
                    - link "View" [ref=e180] [cursor=pointer]:
                      - /url: /post/008a24f1-e422-465f-aa0d-86937075a97c
                      - img [ref=e181]
                    - button "Remove" [ref=e184] [cursor=pointer]:
                      - img [ref=e185]
              - row "Test Post by Real User - Ojas Dixit Test User One Global REMOVED ❤️ 2" [ref=e188]:
                - cell "Test Post by Real User - Ojas Dixit" [ref=e189]
                - cell "Test User One" [ref=e190]
                - cell [ref=e191]
                - cell "Global" [ref=e192]
                - cell "REMOVED" [ref=e193]
                - cell "❤️ 2" [ref=e194]
                - cell [ref=e195]:
                  - generic [ref=e196]:
                    - link "View" [ref=e197] [cursor=pointer]:
                      - /url: /post/a7ff2243-3a89-4677-833c-6c5348270875
                      - img [ref=e198]
                    - button "Remove" [ref=e201] [cursor=pointer]:
                      - img [ref=e202]
              - row "Real User Post Test - Ojas ojas Global REMOVED ❤️ 1" [ref=e205]:
                - cell "Real User Post Test - Ojas" [ref=e206]
                - cell "ojas" [ref=e207]
                - cell [ref=e208]
                - cell "Global" [ref=e209]
                - cell "REMOVED" [ref=e210]
                - cell "❤️ 1" [ref=e211]
                - cell [ref=e212]:
                  - generic [ref=e213]:
                    - link "View" [ref=e214] [cursor=pointer]:
                      - /url: /post/260d4729-d9b5-434d-9162-b6e340a3c13a
                      - img [ref=e215]
                    - button "Remove" [ref=e218] [cursor=pointer]:
                      - img [ref=e219]
  - contentinfo [ref=e222]:
    - generic [ref=e223]:
      - generic [ref=e224]:
        - link "Privacy Policy" [ref=e225] [cursor=pointer]:
          - /url: /policy/privacy-policy
        - link "Terms of Use" [ref=e226] [cursor=pointer]:
          - /url: /policy/terms-of-use
        - link "Cookie Policy" [ref=e227] [cursor=pointer]:
          - /url: /policy/cookie-policy
      - paragraph [ref=e228]: © 2026 Purseable. All rights reserved.
  - button "Open Next.js Dev Tools" [ref=e234] [cursor=pointer]:
    - img [ref=e235]
  - alert [ref=e238]
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | const ADMIN_EMAIL = 'admin@inkboard.com';
  4   | const ADMIN_PASSWORD = 'Assasin@123';
  5   | 
  6   | // Helper: login via the login page
  7   | async function login(page: Page, email: string, password: string) {
  8   |     await page.goto('/login', { waitUntil: 'domcontentloaded' });
  9   |     await page.waitForTimeout(1500);
  10  | 
  11  |     // Fill email - uses placeholder "you@example.com"
  12  |     const emailInput = page.getByPlaceholder('you@example.com');
  13  |     await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  14  |     await emailInput.fill(email);
  15  | 
  16  |     // Fill password - uses placeholder "Your password"
  17  |     const passwordInput = page.getByPlaceholder('Your password');
  18  |     await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  19  |     await passwordInput.fill(password);
  20  | 
  21  |     // Click Log In button
  22  |     const loginButton = page.getByRole('button', { name: 'Log In' });
  23  |     await loginButton.click();
  24  | 
  25  |     // Wait for navigation away from login page
  26  |     await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  27  | }
  28  | 
  29  | test.describe.serial('Admin Post Management', () => {
  30  |     test('Admin can login and access admin panel', async ({ page }) => {
  31  |         await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  32  | 
  33  |         // Navigate to admin
  34  |         await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  35  |         await page.waitForTimeout(2000);
  36  | 
  37  |         // Should see the admin console dashboard
  38  |         const adminContent = page.getByRole('heading', { name: 'Dashboard Overview' });
> 39  |         await expect(adminContent).toBeVisible({ timeout: 15000 });
      |                                    ^ Error: expect(locator).toBeVisible() failed
  40  |         console.log('Admin login and panel access: PASSED');
  41  |     });
  42  | 
  43  |     test('Admin can see posts in Post Management tab', async ({ page }) => {
  44  |         await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  45  |         await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  46  |         await page.waitForTimeout(2000);
  47  | 
  48  |         // Click on Post Management tab
  49  |         await page.getByRole('button', { name: 'Post Management' }).click();
  50  |         await page.waitForTimeout(1500);
  51  | 
  52  |         // Should see the post table with headers
  53  |         const table = page.locator('table');
  54  |         await expect(table).toBeVisible({ timeout: 10000 });
  55  | 
  56  |         const titleHeader = page.locator('th:has-text("Title")');
  57  |         await expect(titleHeader).toBeVisible();
  58  | 
  59  |         const actionsHeader = page.locator('th:has-text("Actions")');
  60  |         await expect(actionsHeader).toBeVisible();
  61  | 
  62  |         console.log('Post Management tab with table: PASSED');
  63  |     });
  64  | 
  65  |     test('Admin can delete (remove) a post from admin panel', async ({ page }) => {
  66  |         await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  67  |         await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  68  |         await page.waitForTimeout(2000);
  69  | 
  70  |         // Navigate to Post Management
  71  |         await page.getByRole('button', { name: 'Post Management' }).click();
  72  |         await page.waitForTimeout(1500);
  73  | 
  74  |         // Find a PUBLISHED post
  75  |         const publishedRow = page.locator('table tbody tr').filter({ hasText: 'PUBLISHED' }).first();
  76  |         const hasPublished = await publishedRow.isVisible({ timeout: 5000 }).catch(() => false);
  77  | 
  78  |         if (!hasPublished) {
  79  |             console.log('No PUBLISHED posts to test removal - skipping');
  80  |             test.skip(true, 'No published posts available');
  81  |             return;
  82  |         }
  83  | 
  84  |         const postTitle = await publishedRow.locator('td').first().textContent();
  85  |         console.log(`Attempting to remove post: "${postTitle}"`);
  86  | 
  87  |         // Listen for the API response
  88  |         const responsePromise = page.waitForResponse(
  89  |             (resp) => resp.url().includes('/api/admin/posts/remove') && resp.request().method() === 'POST',
  90  |             { timeout: 10000 }
  91  |         );
  92  | 
  93  |         // Click the Remove (trash) button on that row
  94  |         await publishedRow.getByRole('button', { name: 'Remove' }).click();
  95  | 
  96  |         const response = await responsePromise;
  97  |         const responseBody = await response.json();
  98  | 
  99  |         console.log(`Remove API response: ${response.status()} - ${JSON.stringify(responseBody)}`);
  100 |         expect(response.status()).toBe(200);
  101 |         expect(responseBody.success).toBe(true);
  102 | 
  103 |         // Verify the post status updated - re-query since React may have re-rendered the row
  104 |         await page.waitForTimeout(1500);
  105 |         const updatedRow = page.locator('table tbody tr').filter({ hasText: postTitle!.trim() }).first();
  106 |         await expect(updatedRow.locator('td:has-text("REMOVED")')).toBeVisible({ timeout: 5000 });
  107 |         console.log('Admin post removal: PASSED');
  108 |     });
  109 | });
  110 | 
  111 | test.describe.serial('User Post Edit, Delete, Archive', () => {
  112 |     let testPostId: string | null = null;
  113 | 
  114 |     test('Create a test post via admin API', async ({ page }) => {
  115 |         await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  116 | 
  117 |         // Use admin posts API with author_id so admin is detected as author
  118 |         const response = await page.evaluate(async () => {
  119 |             const res = await fetch('/api/admin/posts', {
  120 |                 method: 'POST',
  121 |                 headers: { 'Content-Type': 'application/json' },
  122 |                 body: JSON.stringify({
  123 |                     title: 'E2E Test Post for Management',
  124 |                     content: '<p>This is a test post for edit, delete, and archive testing.</p>',
  125 |                     cover_image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80',
  126 |                     tags: 'test,e2e',
  127 |                     author_id: '0d695f2e-b5e9-4334-97fd-9bad584f2cc3', // admin user id
  128 |                 }),
  129 |             });
  130 |             return { status: res.status, data: await res.json() };
  131 |         });
  132 | 
  133 |         console.log('Create test post:', response.status);
  134 | 
  135 |         if (response.status === 201 || response.status === 200) {
  136 |             testPostId = response.data.post?.id || response.data.id;
  137 |             console.log(`Test post created: ${testPostId}`);
  138 |         }
  139 |         expect(testPostId).toBeTruthy();
```