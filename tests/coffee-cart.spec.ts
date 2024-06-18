import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Runs before each test and signs in each page.
  await page.goto("https://coffee-cart.app/");
});

test("Check site content", async ({ page }) => {
  await page.getByLabel("Menu page").isVisible();
  await page.getByLabel("Cart page").isVisible();
  await page.getByLabel("GitHub page").isVisible();
  await expect(page.getByLabel("Cart page")).toHaveText("cart (0)");
});

test("The header buttons work", async ({ page }) => {
  await page.getByLabel("Cart page").click();
  await expect(page).toHaveURL("https://coffee-cart.app/cart");
  await page.getByLabel("GitHub page").click();
  await expect(page).toHaveURL("https://coffee-cart.app/github");
  await page.getByLabel("Menu page").click();
  await expect(page).toHaveURL("https://coffee-cart.app/");
});

test("Check that there is content visible", async ({ page }) => {
  // Select the list items
  const listItems = page.locator("ul[data-v-a9662a08] li");

  // Get the count of list items
  const count = await listItems.count();

  // Assert that the count is 9
  expect(count).toBe(9);
});

test("Loop through each coffee item and check the name and price", async ({
  page,
}) => {
  // Wait for the page to load completely
  await page.waitForLoadState("networkidle");

  // Select the list items
  const listItems = page.locator("ul[data-v-a9662a08] > li");

  // Ensure the list has items
  const itemCount = await listItems.count();
  expect(itemCount).toBeGreaterThan(0);

  // Loop through each list item
  for (let index = 0; index < itemCount; index++) {
    const listItem = listItems.nth(index);

    // Extract the text content of the h4 element (name)
    const name = await listItem.locator("h4").innerText();

    // Extract the text content of the small element (price)
    const priceText = await listItem.locator("small").innerText();

    // Remove the dollar sign and convert the price to a float
    const price = parseFloat(priceText.replace("$", ""));

    // Assertions
    expect(name).not.toBe("");
    expect(price).toBeGreaterThan(0);

    // Logging
    console.log(`The name of element ${index + 1} is: ${name.trim()}`);
    console.log(`The price of element ${index + 1} is: $${price.toFixed(2)}`);
  }

  // Final log after all items are checked
  console.log(`All ${itemCount} items have been checked`);
});

test.describe.configure({ mode: 'parallel' });

test('Randomly adds coffees to the cart and goes through checkout', async ({ page }) => {
  let flipFlop = true;

  for (let i = 0; i < 10; i++) {
    const cups = await page.locator('.cup').elementHandles();
    const itemCount = cups.length;

    if (itemCount === 0) {
      throw new Error('No cups found on the page');
    }

    const randomIndex = Math.floor(Math.random() * itemCount);

    if (cups[randomIndex]) {
      await cups[randomIndex].hover();
      await cups[randomIndex].click();
    } else {
      throw new Error(`Cup at index ${randomIndex} not found`);
    }

    const promoExists = await page.locator('.promo').count();
    if (promoExists > 0) {
      if (flipFlop) {
        await page.locator('.promo .buttons .yes').click();
        console.log('Clicked "Yes, of course!" button');
      } else {
        await page.locator('button').nth(1).click();
        console.log('Clicked "Nah, I\'ll skip." button');
      }
      flipFlop = !flipFlop;
    }
  }

  // Get the cart items count
  const cartText = await page.locator('a[aria-label="Cart page"]').innerText();
  const match = cartText.match(/\((\d+)\)/);
  const itemCount = match ? Number(match[1]) : 0;

  // Check the total price based on item count
  if (itemCount > 0) {
    await expect(page.locator('button[data-test="checkout"]')).not.toHaveText('Total: $0.00');
  } else {
    await expect(page.locator('button[data-test="checkout"]')).toHaveText('Total: $0.00');
  }

  await page.locator('[aria-label="Cart page"]').click();

  let previousTotal = await page.locator('button[data-test="checkout"]').innerText();

  // Function to add, remove, and delete items and check the total
  const checkAndChangeTotal = async (actionSelector: string, actionDescription: string) => {
    const items = await page.locator('.list>div>ul .list-item');
    const itemCount = await items.count();

    if (itemCount === 0) {
      throw new Error('No items found in the list');
    }

    const randomItemsIndex = Math.floor(Math.random() * itemCount);

    if (await items.nth(randomItemsIndex).locator(actionSelector).count() > 0) {
      await items.nth(randomItemsIndex).locator(actionSelector).click({ force: true });

      // Verify the total has changed
      const newTotal = await page.locator('button[data-test="checkout"]').innerText();
      expect(newTotal).not.toBe(previousTotal);
      previousTotal = newTotal;
      console.log(`${actionDescription} was successful. New total is ${newTotal}`);
    } else {
      throw new Error(`Action selector '${actionSelector}' not found for item at index ${randomItemsIndex}`);
    }
  };

  await checkAndChangeTotal('button[aria-label*="Add one"]', "Adding one item");
  await checkAndChangeTotal('button[aria-label*="Remove one"]', "Removing one item");
  await checkAndChangeTotal('button[aria-label*="Remove all"]', "Deleting item");

  // Proceed to checkout
  await page.locator('[aria-label="Proceed to checkout"]').click();
  await page.locator('input[id="name"]').fill('John Doe');
  await page.locator('input[id="email"]').fill('john@aol.com');
  await page.locator('[aria-label="Promotion checkbox"]').click();
  await page.locator('button[id="submit-payment"]').click();
  await expect(page.locator('div[class="snackbar success"]')).toBeVisible();
});
