-- Backfill English descriptions (blurb_en) for the seed treatment catalog.
-- Guarded with `blurb_en IS NULL` so it never overwrites an owner-set English
-- description. Owner-added treatments (other ids) are untouched.

UPDATE "treatments" SET "blurb_en" = 'Deep-cleanses dirt, oil & dead skin — for a fresher, healthier face.' WHERE "id" = 'facial-basic' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'For acne-prone skin — deep-cleans pores and calms inflammation.' WHERE "id" = 'facial-acne' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'A premium facial for smoother, brighter, hydrated, glowing skin.' WHERE "id" = 'facial-platinum' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Microdermabrasion to lift dead skin & renew brighter skin.' WHERE "id" = 'facial-diamond' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Ultrasound technology for optimal absorption of the detox cream.' WHERE "id" = 'facial-detox' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Ultrasound detox — fresh skin with a protected skin barrier.' WHERE "id" = 'facial-lift' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Brightens and evens out dull skin for a glowing look.' WHERE "id" = 'peel-brightening' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Tackles acne and oily skin for healthier, suppler skin.' WHERE "id" = 'peel-acne' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Anti-aging & skin renewal to fight early signs of aging.' WHERE "id" = 'peel-rejuve' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Renews and evens skin tone on arms, back & legs.' WHERE "id" = 'peel-body' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Brightens and hydrates dark or dull lips.' WHERE "id" = 'pico-lip' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Carbon mask to cleanse pores & give instant glowing skin.' WHERE "id" = 'pico-blackdoll' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Shrinks pores, reduces excess oil, fades acne marks.' WHERE "id" = 'pico-pore' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Renews skin & boosts collagen for supple, radiant skin.' WHERE "id" = 'pico-rejuv' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Fades melasma (dark spots) and evens out pigmentation.' WHERE "id" = 'pico-melasma' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Laser + exosome combo for rejuvenation and collagen production.' WHERE "id" = 'pico-ultimate' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Reduces scars & acne marks with deep laser + exosome.' WHERE "id" = 'pico-signature' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Targets face, underarms, arms & legs for hair-free skin.' WHERE "id" = 'dpl-hair' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Fades dark spots or light blemishes for brighter skin.' WHERE "id" = 'dpl-pigmen' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Tames stubborn acne and calms inflammatory redness.' WHERE "id" = 'dpl-acne' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Improves uneven skin texture and keeps the face firm.' WHERE "id" = 'dpl-rejuve' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Skin renewal + collagen production + texture repair. 3cc.' WHERE "id" = 'sb-cell' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Hydrates + softens fine lines. 3cc.' WHERE "id" = 'sb-jalupro' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Smooths fine lines + fades dark circles. 3cc.' WHERE "id" = 'sb-nctf-eyes' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Evens texture + adds glow. 3cc.' WHERE "id" = 'sb-nctf-135' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Improves texture + adds glow. 3cc.' WHERE "id" = 'sb-rejuran-hb' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Skin regeneration & healing. 3cc.' WHERE "id" = 'sb-rejuran-healer' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Skin-cell regeneration & repair. 2cc.' WHERE "id" = 'sb-rejuran-scar' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Stimulates collagen + a plumping effect. 3cc.' WHERE "id" = 'sb-juvelook' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Hydration + regeneration. 1.5cc.' WHERE "id" = 'sb-nucleo-med' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Firming + restructuring. 1.5cc.' WHERE "id" = 'sb-nucleo-strong' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Natural brightening & fades dark spots with microneedling.' WHERE "id" = 'derma-bright' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Calms inflammation & controls oil for faster acne recovery.' WHERE "id" = 'derma-acne' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Minimizes hair loss & stimulates new hair growth.' WHERE "id" = 'derma-hair' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Salmon DNA to minimize wrinkles & early signs of aging.' WHERE "id" = 'derma-pdrn' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Repairs skin from within & stimulates collagen production.' WHERE "id" = 'derma-plasma' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Deepest skin-cell renewal for facial hydration & elasticity.' WHERE "id" = 'derma-exosome' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Growth factors & exosomes activate natural skin regeneration.' WHERE "id" = 'exo-recovery' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Deep skin repair, boosts elasticity & texture.' WHERE "id" = 'exo-radiance' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Premium exosome for advanced skin rejuvenation.' WHERE "id" = 'exo-biocell' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Reduces dynamic wrinkles & expression lines. Price per unit.' WHERE "id" = 'botox-korea' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Reduces dynamic wrinkles & expression lines. Price per unit.' WHERE "id" = 'botox-us' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Refreshes skin, shrinks pores, controls oil. Starting from.' WHERE "id" = 'microbotox-korea' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Refreshes skin & softens wrinkles naturally. Starting from.' WHERE "id" = 'microbotox-us' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Fills & defines facial contours: cheeks, lips, chin, under-eyes. Starting from.' WHERE "id" = 'filler' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Speeds up acne recovery & minimizes marks. Starting from.' WHERE "id" = 'acne-injection' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Boosts energy & immunity — great for first-timers.' WHERE "id" = 'iv-basic-inj' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Brightens dull skin & supports overall health.' WHERE "id" = 'iv-basic-inf' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Intense brightening & evens out uneven skin tone.' WHERE "id" = 'iv-advanced' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Intensive anti-aging, accelerates skin regeneration.' WHERE "id" = 'iv-premium' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Brightens dull skin & fades dark spots.' WHERE "id" = 'meso-melasma' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Restores elasticity — firmer, healthier-feeling skin.' WHERE "id" = 'meso-aging' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Tackles hair loss & stimulates new hair growth.' WHERE "id" = 'meso-hair' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Reduces facial fat (double chin) & sculpts a slimmer contour. Starting from.' WHERE "id" = 'meso-lipo-v' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Hydro-dermabrasion for clearer, acne-prone skin.' WHERE "id" = 'jet-acne' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Lifts sagging skin & deeply hydrates for suppler skin.' WHERE "id" = 'jet-brightening' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Platinum Glow Facial + PDT Red Light + Jet Peel Oxy Brightening.' WHERE "id" = 'pkg-hydra-ess' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = '+ Dermapen Nano Hydra Skinbooster for texture & glow.' WHERE "id" = 'pkg-hydra-sig' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = '+ Glass Skin Hyalo Skinbooster & collagen biostimulator.' WHERE "id" = 'pkg-hydra-prem' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = 'Platinum Glow Facial + PDT Red Light + RF Skin Lifting.' WHERE "id" = 'pkg-youth-ess' AND "blurb_en" IS NULL;
--> statement-breakpoint
UPDATE "treatments" SET "blurb_en" = '+ DPL Photofacial Rejuvenation for bright, firm skin.' WHERE "id" = 'pkg-youth-rad' AND "blurb_en" IS NULL;
