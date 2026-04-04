import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'ojas@gmail.com',
  password: 'Assasin@123'
};

test('user can sign out successfully', async ({ page }) => {
  // Step 1: Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Step 2: Fill in credentials
  await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
  await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
  
  // Step 3: Click login button
  await page.click('button[type="submit"]');
  
  // Step 4: Wait for redirect to home/feed after login
  await page.waitForTimeout(3000);
  
  // Verify we're logged in (navbar should show profile)
  const profileTrigger = page.locator('button.profile-trigger').first();
  await expect(profileTrigger).toBeVisible({ timeout: 5000 });
  
  // Step 5: Click on profile menu to open it
  await profileTrigger.click();
  await page.waitForTimeout(500);
  
  // Step 6: Find and click sign out button
  const signOutButton = page.locator('.profile-menu-logout').first();
  await expect(signOutButton).toBeVisible({ timeout: 2000 });
  
  // Step 7: Click sign out
  await signOutButton.click();
  
  // Step 8: Wait for navigation to login page
  await page.waitForURL('/login', { timeout: 10000 });
  
  // Step 9: Verify we're on login page and can see login form
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  
  console.log('✅ Sign out test passed - user was redirected to login page');
});

test('sign out button shows loading state', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Open profile menu
  await page.click('button.profile-trigger');
  await page.waitForTimeout(500);
  
  // Click sign out
  const signOutButton = page.locator('.profile-menu-logout').first();
  await signOutButton.click();
  
  // Verify loading state is shown (button should show spinner or disabled state)
  await expect(signOutButton).toBeDisabled();
  
  // Wait for navigation
  await page.waitForURL('/login', { timeout: 10000 });
});
