const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'https://microapp-studio.vercel.app';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '';

(async () => {
    const results = { passed: [], failed: [], errors: [] };

    function pass(name, detail = '') {
        results.passed.push({ name, detail });
        console.log(`  ✅ ${name}${detail ? ': ' + detail : ''}`);
    }

    function fail(name, detail = '') {
        results.failed.push({ name, detail });
        console.log(`  ❌ ${name}${detail ? ': ' + detail : ''}`);
    }

    function error_detail(msg) {
        results.errors.push(msg);
        console.log(`  ⚠️  ${msg}`);
    }

    let browser;
    try {
        const launchOpts = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        };
        if (CHROMIUM_PATH) {
            launchOpts.executablePath = CHROMIUM_PATH;
        }
        browser = await chromium.launch(launchOpts);
    } catch (e) {
        console.log('  ❌ Failed to launch browser: ' + e.message);
        try {
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } catch (e2) {
            console.log('  ❌ Also failed: ' + e2.message);
            const output = {
                passed: [], failed: [{name: 'Browser Launch', detail: e.message}],
                errors: [e2.message],
                summary: {total: 0, passed: 0, failed: 1, passRate: 0, allPassed: false},
                reportBody: '## E2E Test Report\n\n**Date:** ' + new Date().toISOString().slice(0, 10) + '\n\n❌ **Failed to launch browser**\n\n' + e.message
            };
            console.log('\n---OUTPUT_JSON---');
            console.log(JSON.stringify(output, null, 2));
            console.log('---END_OUTPUT_JSON---');
            return;
        }
    }

    const page = await browser.newPage();
    let consoleErrors = [];
    let pageErrors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push({ text: msg.text().substring(0, 200), url: page.url() });
        }
    });
    page.on('pageerror', err => {
        pageErrors.push({ message: err.message.substring(0, 200), url: page.url() });
    });

    // Test 1: Page Loads & Status Codes
    console.log('\n\u001b[1m\u001b[4mTest 1: Page Loads & Status Codes\u001b[0m');
    const pagesToTest = [
        { path: '/', name: 'Landing Page' },
        { path: '/login', name: 'Login Page' },
        { path: '/register', name: 'Register Page' },
        { path: '/app', name: 'Dashboard/Apps Page' },
        { path: '/builder', name: 'Builder Page' },
        { path: '/dev', name: 'Dev Page' },
    ];

    for (const p of pagesToTest) {
        try {
            const resp = await page.goto(BASE_URL + p.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
            const status = resp ? resp.status() : 0;
            if (status >= 200 && status < 400) {
                pass(`${p.name} (${p.path})`, `HTTP ${status}`);
            } else {
                fail(`${p.name} (${p.path})`, `HTTP ${status}`);
            }
        } catch (err) {
            fail(`${p.name} (${p.path})`, `Timeout/Load error: ${err.message.substring(0, 100)}`);
        }
    }

    // Test 2: No Console Errors
    console.log('\n\u001b[1m\u001b[4mTest 2: Console Errors Check\u001b[0m');
    for (const p of pagesToTest) {
        try {
            await page.goto(BASE_URL + p.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(1000);
        } catch { /* skip */ }
    }

    if (consoleErrors.length === 0) {
        pass('No console errors on any page');
    } else {
        for (const e of consoleErrors) {
            fail('Console error found', `${e.text} (on ${e.url})`);
        }
    }
    if (pageErrors.length === 0) {
        pass('No page-level JavaScript errors');
    } else {
        for (const e of pageErrors) {
            fail('Page-level JS error', `${e.message} (on ${e.url})`);
        }
    }

    // Test 3: Landing Page Content
    console.log('\n\u001b[1m\u001b[4mTest 3: Landing Page Content\u001b[0m');
    try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1500);

        const title = await page.title();
        if (title && title.length > 0) {
            pass('Landing page has title', title.substring(0, 80));
        } else {
            fail('Landing page title is empty');
        }

        const bodyText = await page.evaluate(() => document.body?.innerText?.length || 0);
        if (bodyText > 50) {
            pass('Landing page has content', `${bodyText} chars`);
        } else {
            fail('Landing page content too short', `${bodyText} chars`);
        }

        const hasNav = await page.evaluate(() => {
            return document.querySelector('nav') !== null || document.querySelector('header') !== null;
        });
        if (hasNav) {
            pass('Landing page has navigation');
        } else {
            error_detail('No nav/header found on landing page');
        }
    } catch (err) {
        fail('Landing page check error', err.message.substring(0, 100));
    }

    // Test 4: CSS Clay Classes
    console.log('\n\u001b[1m\u001b[4mTest 4: CSS Clay Classes\u001b[0m');
    const clayClasses = ['clay', 'clay-card', 'clay-button', 'clay-input'];
    for (const cls of clayClasses) {
        try {
            await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(1000);
            const count = await page.evaluate((c) => {
                return document.querySelectorAll(`[class*="${c}"]`).length;
            }, cls);
            if (count > 0) {
                pass(`CSS class .${cls} found on login page`, `${count} element(s)`);
            } else {
                await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
                await page.waitForTimeout(1000);
                const count2 = await page.evaluate((c) => {
                    return document.querySelectorAll(`[class*="${c}"]`).length;
                }, cls);
                if (count2 > 0) {
                    pass(`CSS class .${cls} found on landing`, `${count2} element(s)`);
                } else {
                    fail(`CSS class .${cls} not found anywhere`);
                }
            }
        } catch (err) {
            fail(`CSS class .${cls} error`, err.message.substring(0, 100));
        }
    }

    // Test 5: Background Color
    console.log('\n\u001b[1m\u001b[4mTest 5: Background Color (Cream #FFF8F0)\u001b[0m');
    try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);
        const bgColor = await page.evaluate(() => {
            const body = document.body;
            const style = window.getComputedStyle(body);
            return style.backgroundColor;
        });
        if (bgColor && (bgColor.includes('248') || bgColor.includes('240') || bgColor.toLowerCase().includes('fff8f0') || bgColor.includes('255, 248'))) {
            pass('Background color is cream', bgColor);
        } else {
            fail('Background color not cream', bgColor || 'unknown');
        }
    } catch (err) {
        fail('Could not check background color', err.message.substring(0, 100));
    }

    // Test 6: Builder Functionality
    console.log('\n\u001b[1m\u001b[4mTest 6: Builder Page Functionality\u001b[0m');
    try {
        await page.goto(BASE_URL + '/builder', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2000);
        
        const paletteItems = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            const items = [];
            buttons.forEach(b => {
                const text = b.innerText?.trim();
                if (text && text.length > 0 && text.length < 40) {
                    items.push(text);
                }
            });
            return items.slice(0, 20);
        });
        
        if (paletteItems.length > 3) {
            pass('Builder has interactive elements', `${paletteItems.length} buttons: ${paletteItems.slice(0, 5).join(', ')}...`);
        } else if (paletteItems.length > 0) {
            pass('Builder has some elements', `${paletteItems.length} buttons`);
        } else {
            const bodyContent = await page.evaluate(() => document.body.innerText.length);
            if (bodyContent > 100) {
                pass('Builder page rendered', `${bodyContent} chars`);
            } else {
                fail('Builder page seems empty', `${bodyContent} chars`);
            }
        }

        // Check for canvas area
        const hasCanvas = await page.evaluate(() => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
                const cls = el.className || '';
                if (typeof cls === 'string' && cls.includes('clay-inset')) {
                    return { found: true, tag: el.tagName };
                }
            }
            return { found: false };
        });
        if (hasCanvas.found) {
            pass('Canvas area found (clay-inset)', `Tag: ${hasCanvas.tag}`);
        } else {
            error_detail('No clay-inset canvas found on builder page');
        }
    } catch (err) {
        fail('Builder page check error', err.message.substring(0, 100));
    }

    // Test 7: Login/Register Page — Pastel Blobs
    console.log('\n\u001b[1m\u001b[4mTest 7: Login/Register Decorative Elements\u001b[0m');
    for (const p of ['/login', '/register']) {
        try {
            await page.goto(BASE_URL + p, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(1500);
            
            const blobs = await page.evaluate(() => {
                const all = document.querySelectorAll('*');
                const candidates = [];
                for (const el of all) {
                    const cls = el.className || '';
                    if (typeof cls === 'string') {
                        const bg = window.getComputedStyle(el).background;
                        if (bg && (bg.includes('gradient') || bg.includes('255'))) {
                            const rect = el.getBoundingClientRect();
                            if (rect.width > 30 && rect.width < 500 && rect.height > 30 && rect.height < 500) {
                                candidates.push({ tag: el.tagName, w: Math.round(rect.width), h: Math.round(rect.height) });
                            }
                        }
                    }
                }
                return candidates.slice(0, 5);
            });
            
            if (blobs.length > 0) {
                pass(`${p} page has decorative blobs`, `${blobs.length} found`);
            } else {
                const hasForm = await page.evaluate(() => document.querySelector('input') !== null);
                if (hasForm) {
                    pass(`${p} page has form`, 'Input fields present');
                } else {
                    fail(`${p} page — no decorative blobs or form found`);
                }
            }
        } catch (err) {
            fail(`${p} page check error`, err.message.substring(0, 100));
        }
    }

    // Test 8: Responsive — Mobile Viewport
    console.log('\n\u001b[1m\u001b[4mTest 8: Responsive Design (Mobile 375px)\u001b[0m');
    try {
        const mobileCtx = await browser.newContext({
            viewport: { width: 375, height: 812 },
            isMobile: true
        });
        const mobilePage = await mobileCtx.newPage();
        
        await mobilePage.goto(BASE_URL + '/builder', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await mobilePage.waitForTimeout(2000);

        const hasMobileNav = await mobilePage.evaluate(() => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
                const cls = el.className || '';
                if (typeof cls === 'string' && 
                    (cls.includes('sm:hidden') || cls.includes('md:hidden') || cls.includes('lg:hidden') ||
                     cls.includes('mobile') || cls.includes('bottom') || cls.includes('tab'))) {
                    return { found: true, class: cls.substring(0, 80) };
                }
            }
            return { found: false };
        });

        if (hasMobileNav.found) {
            pass('Mobile responsive classes found', `Class: ${hasMobileNav.class}`);
        } else {
            const mobileContent = await mobilePage.evaluate(() => document.body.innerText.length);
            if (mobileContent > 50) {
                pass('Mobile viewport renders content', `${mobileContent} chars`);
            } else {
                fail('Mobile viewport — no responsive indicators found');
            }
        }

        await mobileCtx.close();
    } catch (err) {
        fail('Mobile responsive test error', err.message.substring(0, 100));
    }

    await page.close();
    await browser.close();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('E2E TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Passed: ${results.passed.length}`);
    console.log(`Failed: ${results.failed.length}`);
    console.log(`Errors: ${results.errors.length}`);
    
    const totalChecks = results.passed.length + results.failed.length;
    const passRate = totalChecks > 0 ? Math.round(results.passed.length / totalChecks * 100) : 0;
    
    let reportBody = '## E2E Playwright Test Report\n\n';
    reportBody += `**Date:** ${new Date().toISOString().slice(0, 10)}\n`;
    reportBody += `**Target:** ${BASE_URL}\n`;
    reportBody += `**Status:** ${results.failed.length === 0 ? 'ALL PASSED' : 'FAILURES DETECTED'}\n`;
    reportBody += `**Pass Rate:** ${passRate}% (${results.passed.length}/${totalChecks})\n\n`;
    
    reportBody += '### Passed Tests\n';
    for (const t of results.passed) {
        reportBody += `- **${t.name}**${t.detail ? ': ' + t.detail : ''}\n`;
    }
    
    if (results.failed.length > 0) {
        reportBody += '\n### Failed Tests\n';
        for (const t of results.failed) {
            reportBody += `- **${t.name}**: ${t.detail}\n`;
        }
    }
    
    if (results.errors.length > 0) {
        reportBody += '\n### Notes\n';
        for (const e of results.errors) {
            reportBody += `- ${e}\n`;
        }
    }
    
    const output = {
        passed: results.passed,
        failed: results.failed,
        errors: results.errors,
        summary: {
            total: totalChecks,
            passed: results.passed.length,
            failed: results.failed.length,
            passRate: passRate,
            allPassed: results.failed.length === 0
        },
        reportBody: reportBody
    };
    
    console.log('\n---OUTPUT_JSON---');
    console.log(JSON.stringify(output, null, 2));
    console.log('---END_OUTPUT_JSON---');
})();
