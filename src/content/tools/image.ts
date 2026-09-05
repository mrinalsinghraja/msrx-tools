import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the Image tools. Server-only.
 */
export const IMAGE_CONTENT: Record<string, ToolContent> = {

  "resize-image": {
    intro: `Resizing sounds like one operation and is really three, which is why so many resized images come out wrong. Fitting an image inside a box keeps its proportions and leaves space; filling the box keeps proportions and crops the overflow; stretching to exact dimensions keeps everything and distorts it. This tool asks which one you want rather than choosing for you.

Fit is the right answer nearly always. It guarantees the whole picture survives and nothing is squashed. Fill is what you want for a thumbnail grid or a cover image, where every tile must be the same shape and losing the edges matters less than consistency. Stretching to exact dimensions is almost never what anyone means, and the visible result is a face that is subtly too wide.

Downscaling is where quality is won or lost. Reducing an image to less than half its size in one step produces aliasing — the jagged edges and shimmering detail that make a resized photograph look cheap — because the resampler is skipping pixels rather than averaging them. This uses the browser's high-quality resampling path, which handles the common cases properly.

Upscaling deserves a warning rather than a setting. Enlarging an image cannot add detail that was never captured; it can only interpolate between the pixels that exist, which produces softness. A 400-pixel image blown up to 1600 will look like a 400-pixel image blown up. If the result matters, find a larger original.

The dimensions of the result are reported alongside the file size, so you can confirm the aspect ratio survived and see what the resize cost or saved in bytes.`,
    steps: [
      "Drop in the images. A batch is processed one after another with the same settings.",
      "Choose how to resize: fit inside a box, fill it and crop the excess, or force exact dimensions.",
      "Enter the target size. Fit and fill need a box; percentage scaling needs only a figure.",
      "Download the results, and check the reported dimensions if the aspect ratio matters.",
    ],
    faq: [
      {
        q: "Which resize mode should I use?",
        a: "Fit, unless you have a specific reason not to. It keeps the whole image and its proportions. Fill is for thumbnail grids where uniform shape matters more than the edges. Exact dimensions distorts the picture and is rarely what anyone actually wants.",
      },
      {
        q: "Why does my enlarged image look soft?",
        a: "Because enlarging cannot invent detail. It interpolates between existing pixels, which is inherently blurry. No tool can recover information that was never in the file — the answer is a larger original.",
      },
      {
        q: "Are my photographs uploaded?",
        a: "No. Decoding, resizing and re-encoding all happen on a canvas inside this browser tab. Nothing is transmitted, which is why the page works offline and why family photographs are safe to run through it.",
      },
      {
        q: "Does resizing reduce the file size?",
        a: "Substantially, since there are fewer pixels to store. Halving both dimensions quarters the pixel count. If size is the actual goal rather than dimensions, the compression tool gets there with less loss of detail.",
      },
    ],
  },

  "compress-image": {
    intro: `Most images on the web are several times larger than they need to be. A photograph straight from a phone is optimised for editing rather than for loading, and re-encoding it at a sensible quality typically removes seventy per cent of the bytes with no visible difference at all.

This compresses using the browser's own encoders. You can aim for a quality level, or give a target file size and let the tool search for the quality that reaches it — the second is what you want when a form refuses anything over two megabytes.

JPEG compression is lossy, and the useful thing to understand is what it discards. It throws away detail the eye is bad at noticing, particularly fine colour variation, while preserving the brightness edges that carry the shape of the image. That is why quality 80 looks identical to quality 100 on a photograph and why it looks obviously wrong on a screenshot of text: sharp black-on-white edges are exactly what the algorithm is designed to smooth.

So the format matters as much as the setting. Photographs want JPEG or WebP. Screenshots, diagrams and anything with text or flat colour want PNG, which is lossless, or WebP, which does both. Compressing a screenshot as JPEG produces the halo of grey fuzz around lettering that gives it away instantly.

Recompressing an already-compressed image loses a little more each time, and it does not come back. Keep the original wherever you can and compress a copy, especially if the file may need to be re-exported at a different size later.`,
    steps: [
      "Drop in the images you want smaller.",
      "Choose a quality level, or set a target file size and let the tool find the quality that reaches it.",
      "Keep photographs as JPEG or WebP; switch screenshots and diagrams to PNG or WebP instead.",
      "Compare the before and after sizes, and check the result at full size before replacing the original.",
    ],
    faq: [
      {
        q: "What quality should I use?",
        a: "Around 80 for photographs, where the difference from 100 is invisible and the saving is large. Above 90 you are storing detail nobody will see. Below 70 the artefacts start to show on skin tones and gradients.",
      },
      {
        q: "Why does my screenshot look terrible?",
        a: "Because JPEG is built for photographs and discards exactly the sharp edges that text is made of. Use PNG for screenshots and diagrams, or WebP, which handles both kinds of image well.",
      },
      {
        q: "Can I get back to the original quality?",
        a: "No. Lossy compression discards data permanently, and each recompression discards a little more. Always keep the original and compress a copy.",
      },
      {
        q: "Should I use WebP instead of JPEG?",
        a: "Usually yes for the web — WebP is roughly 25 to 35 per cent smaller at the same visual quality and every current browser supports it. JPEG remains the safer choice for a file that may be opened by older software or emailed to someone.",
      },
    ],
  },

  "convert-image": {
    intro: `Image formats are not interchangeable, and picking the wrong one is the most common reason a page loads slowly or a screenshot looks smeared. This converts between JPEG, PNG, WebP and AVIF using the browser's own codecs.

The choice comes down to two questions. Does the image need transparency, and is it a photograph or a graphic? PNG is lossless and supports transparency, which makes it right for logos, icons, screenshots and anything with flat colour or text. JPEG is lossy, has no transparency, and is right for photographs. WebP does both and is smaller than either. AVIF is smaller still and slower to encode.

Converting to JPEG flattens transparency, and the tool fills it with white rather than producing a black background, which is what an unhandled alpha channel usually gives you. That is worth knowing before converting a logo with a transparent background for use on a dark page.

Conversion cannot undo previous compression. Turning a JPEG into a PNG produces a lossless copy of an image that already lost detail — the file gets larger and the artefacts stay exactly where they were. The conversion that helps is the other direction, or from a lossless original into a modern format.

HEIC is the one format that cannot be handled here and it is worth explaining rather than failing silently. Only Safari can decode it, because the codec is patent-encumbered and other browsers do not ship it. On an iPhone, setting Camera to "Most Compatible" produces JPEGs instead, which is the practical fix.`,
    steps: [
      "Drop in the images you want converted.",
      "Choose the target format: PNG for graphics and transparency, JPEG for photographs, WebP for the web.",
      "Set a quality level if converting to a lossy format.",
      "Download the results and compare the file sizes, which is usually the reason for converting in the first place.",
    ],
    faq: [
      {
        q: "Which format should I use for the web?",
        a: "WebP for nearly everything — it handles photographs and graphics, supports transparency, and is a quarter to a third smaller than the equivalent JPEG or PNG. Keep a JPEG fallback only if you must support genuinely old software.",
      },
      {
        q: "Why can it not open my HEIC photographs?",
        a: "Because only Safari ships the decoder, the codec being patent-encumbered. On an iPhone, changing Settings, then Camera, then Formats to “Most Compatible” makes the phone save JPEGs instead.",
      },
      {
        q: "What happens to a transparent background in a JPEG?",
        a: "It is filled with white, since JPEG has no alpha channel. Convert to PNG or WebP if the transparency needs to survive — particularly for a logo destined for a dark background.",
      },
      {
        q: "Does converting a JPEG to PNG improve it?",
        a: "No. The detail lost when it was first compressed is gone, and a PNG merely stores those artefacts losslessly in a larger file. Convert from an original, not from an already-compressed copy.",
      },
    ],
  },

  "crop-image": {
    intro: `Cropping removes what should not be in the picture, and it is the single edit that improves a photograph most reliably. This does it visually, with a draggable selection over the image, and adds the aspect-ratio presets that make cropping for a specific destination straightforward.

Fixed ratios are the part that saves the most trouble. A profile picture that must be square, a banner that must be 16:9, a poster at 4:5 — locking the ratio means dragging to frame the shot without also having to hit exact pixel dimensions. The presets cover the common cases and a custom ratio is available for the ones they do not.

Cropping is lossless in the sense that matters: it removes pixels rather than degrading the ones it keeps. Re-encoding afterwards is where quality can be lost, so a JPEG cropped and saved as JPEG goes through one more compression cycle. Saving the result as PNG avoids that at the cost of a larger file, which is worth it when the image will be edited again.

Composition advice that actually holds: leave more space in front of a face or a moving subject than behind it, keep the horizon off the exact centre, and be more aggressive than feels comfortable — an over-tight crop is far more common a regret in the other direction. Crop from a copy so the original framing remains available.

The dimensions of the selection are shown as you drag, so cropping to a specific pixel size is possible without guessing.`,
    steps: [
      "Drop in the image and drag a selection over the part you want to keep.",
      "Lock an aspect ratio if the result has a fixed destination — square for a profile, 16:9 for a banner.",
      "Fine-tune the edges. The selection dimensions are shown as you drag.",
      "Download the crop. Save as PNG if the image will be edited again, to avoid another round of JPEG compression.",
    ],
    faq: [
      {
        q: "Does cropping reduce image quality?",
        a: "The crop itself does not — it discards pixels rather than altering the ones it keeps. Re-encoding as JPEG afterwards adds one more compression cycle, which saving as PNG avoids.",
      },
      {
        q: "What aspect ratio should a profile picture be?",
        a: "Square. Nearly every platform crops to a square or a circle, and supplying anything else means the platform chooses what to cut. Cropping it yourself means you choose.",
      },
      {
        q: "Can I crop several images to the same region?",
        a: "Not in one pass here, since the right crop depends on what is in each picture. For a uniform result across a batch, the fill mode on the resize tool crops every image to the same shape automatically.",
      },
      {
        q: "Is my image uploaded?",
        a: "No. It is decoded onto a canvas in this tab and the crop is taken there. Nothing leaves the browser at any point.",
      },
    ],
  },

  "rotate-image": {
    intro: `Photographs arrive sideways for a specific and fixable reason. A phone camera records the sensor's orientation in an EXIF tag rather than rotating the pixels, and software that ignores the tag shows the image the way the sensor saw it. This rotates the actual pixels, so the result is right everywhere regardless of what reads it.

Rotation in ninety-degree steps is lossless in principle: the pixels move rather than change. Flipping horizontally or vertically is the same. Arbitrary angles are different — rotating by seven degrees to straighten a horizon requires resampling every pixel, which softens the image slightly and needs the corners either filled or cropped.

Because this reads the EXIF orientation tag when decoding, an image that already appears upright in a modern viewer will be handled as it appears rather than as it is stored. The output has its pixels in the correct arrangement and no orientation tag to misinterpret, which is what makes it reliable in older software, in print workflows and in anything that ignores metadata.

A related consequence worth knowing: this is why an image sometimes looks correct on a phone and sideways once uploaded. The phone reads the tag and the receiving system does not. Rotating the pixels here removes the ambiguity permanently.

Batch rotation applies the same transformation to every image, which is right for a set of scans that all came out sideways and wrong for a mixed folder — those want doing in groups.`,
    steps: [
      "Drop in the images that need turning.",
      "Choose a rotation of 90, 180 or 270 degrees, or a horizontal or vertical flip.",
      "Apply the same transformation to a whole batch when they all came out the same way.",
      "Download the results. The pixels are rotated, so they display correctly in software that ignores EXIF.",
    ],
    faq: [
      {
        q: "Why does my photograph look sideways in some apps and not others?",
        a: "Because the camera stored the orientation as an EXIF tag rather than rotating the pixels. Software that reads the tag shows it upright; software that ignores it shows it as stored. Rotating the pixels removes the disagreement.",
      },
      {
        q: "Does rotating lose quality?",
        a: "Not in ninety-degree steps, where pixels are rearranged rather than recalculated. Re-encoding as JPEG afterwards costs a little, which saving as PNG avoids.",
      },
      {
        q: "Can I straighten a crooked horizon?",
        a: "This tool handles right angles and flips. An arbitrary angle needs resampling and leaves corners to fill or crop, which is a job for an editor with a visual straightening guide.",
      },
      {
        q: "What is the difference between rotating and flipping?",
        a: "Rotation turns the image; flipping mirrors it. A flipped photograph has any text in it reversed, which is usually the giveaway that a mirror was applied where a rotation was meant.",
      },
    ],
  },

  "watermark-image": {
    intro: `A watermark marks an image as yours. It will not stop a determined person from removing it, and it is not meant to — its job is to make casual reuse obviously attributed and to make the original owner traceable when the image travels.

This stamps text across a picture, once in a chosen position or tiled across the whole surface, with control over size, colour, opacity and rotation.

Placement is the trade-off. A small mark in a corner is unobtrusive and is also the easiest thing in the world to crop out. A tiled watermark across the whole image survives cropping and is far harder to remove, at the cost of being visible over the subject. Which you want depends on whether the image is a portfolio piece being shown or a proof being sent to a client who has not paid yet — and the answer genuinely differs between those two.

Opacity does more work than size. A watermark at fifteen or twenty per cent is legible when looked for and does not fight the image; the same text at full strength ruins the picture for the person you wanted to impress. Diagonal rotation across the frame is harder to clone out than horizontal text, because it crosses more varied content.

Batch processing applies the same watermark to every image, which is the usual case for a set of proofs or a portfolio upload.

If the goal is provenance rather than deterrence, the steganography tool on this site embeds text invisibly, which survives cropping in the middle of the image and is not visible to remove.`,
    steps: [
      "Drop in the images to be marked.",
      "Enter the watermark text — a name, a domain, or a status such as “proof”.",
      "Choose a single placement or tile it across the image, depending on whether cropping is a concern.",
      "Set the opacity low, around fifteen to twenty-five per cent, so the mark reads without overwhelming the picture.",
    ],
    faq: [
      {
        q: "Can a watermark be removed?",
        a: "Yes, with effort — cropping removes a corner mark and content-aware fill can take out a tiled one. It raises the cost of casual reuse rather than preventing determined theft, which is what a watermark has always been for.",
      },
      {
        q: "Corner or tiled?",
        a: "A corner mark for work you are showing off, where the image should look good. Tiled for proofs and previews, where the point is that the file is not usable until it is paid for.",
      },
      {
        q: "What opacity works best?",
        a: "Between fifteen and twenty-five per cent for most images. Legible when looked at, invisible enough not to fight the subject. Full opacity protects the image by ruining it.",
      },
      {
        q: "Is there an invisible option?",
        a: "The steganography tool on this site hides text in the image data itself, which survives cropping through the middle and cannot be seen to be removed. It is the better choice when the goal is proving ownership rather than deterring reuse.",
      },
    ],
  },

  "exif-viewer": {
    intro: `Every photograph from a phone or a camera carries metadata alongside the pixels: which device took it, the lens, the exposure settings, the exact moment, and — this is the one that matters — frequently the coordinates where it was taken, accurate to a few metres.

This reads that data out and shows it. Camera settings for the curious or the learning, timestamps for anyone reconstructing a sequence of events, and the location if it is there.

The location is the reason most people arrive at a page like this. A photograph taken at home and posted publicly can carry the coordinates of the house. That is not a hypothetical risk; it is the mechanism behind a documented category of incident, and it is invisible unless something reads the file. There is an option to confirm a position exists without displaying it, for when you want to check before sharing rather than see the coordinates yourself.

No map is shown, and that is deliberate rather than an omission. Rendering a map means requesting tiles from a map provider, and that request would tell the provider the coordinates of your photograph — which is precisely the exposure you came here to check. The coordinates are given in decimal degrees for you to look up wherever you choose.

EXIF is a JPEG and TIFF convention. PNG and WebP store metadata differently and screenshots generally have none at all, so those are not accepted rather than reported as empty.

When you want the data gone rather than shown, the metadata removal tool strips all of it and re-encodes the image.`,
    steps: [
      "Drop in the JPEG or TIFF files you want to inspect.",
      "Read the report: camera and lens, exposure settings, timestamps, and location if present.",
      "Switch off the location option to confirm a position exists without putting the coordinates on screen.",
      "Run the images through the metadata removal tool before publishing anything that carries a position.",
    ],
    faq: [
      {
        q: "Does my photograph really contain my location?",
        a: "If location services were enabled for the camera, yes, to within a few metres. It is stored in the file and travels with it, and most sharing methods preserve it. This tool tells you for certain.",
      },
      {
        q: "Why is there no map?",
        a: "Because loading map tiles would send the coordinates to a map provider, which is exactly the disclosure you are here to prevent. The coordinates are shown as numbers so you can look them up somewhere of your own choosing.",
      },
      {
        q: "Why will it not read my PNG?",
        a: "EXIF is a JPEG and TIFF convention. PNG and WebP have their own metadata containers, and screenshots typically carry nothing at all. Accepting those and reporting them empty would be misleading.",
      },
      {
        q: "Do social networks strip this data?",
        a: "Most strip location when publishing, though not consistently across every upload path, and stripping on publication does not mean it was never received. Removing it before uploading is the only version you control.",
      },
    ],
  },

  "strip-image-metadata": {
    intro: `Removing metadata from a photograph before publishing it is a small habit that closes a real exposure. The file that leaves your camera carries the device, the settings, the timestamp, sometimes a serial number, and frequently the coordinates of wherever you were standing.

This strips all of it. The image is decoded and re-encoded from the pixels alone, so nothing from the original container survives — not the EXIF block, not the maker notes, not the embedded thumbnail.

That embedded thumbnail is worth singling out, because it has caused genuine incidents. Cameras store a small preview inside the file, and some editing software updates the full image while leaving the thumbnail as it was. A photograph cropped to remove something can retain a thumbnail showing the uncropped original, and anyone who extracts it sees what was cut. Re-encoding from pixels removes that possibility entirely.

What is lost along with it: the orientation tag, which is why this tool applies the rotation to the pixels before stripping, so the image stays the right way up. Also the colour profile, which can shift colours slightly on wide-gamut displays, and the copyright field if you had set one.

The re-encode does mean one more compression cycle for a JPEG. Choose PNG output if the file is going to be edited again, and accept the larger result in exchange for no further loss.

If you want to see what is in a file before deciding, the EXIF viewer on this site shows it without changing anything.`,
    steps: [
      "Drop in the photographs you are about to publish.",
      "Choose the output format — the same one to keep things simple, or PNG to avoid another compression pass.",
      "Download the cleaned files. Everything from the original container is gone, including the embedded thumbnail.",
      "Check one in the EXIF viewer if you want confirmation that nothing survived.",
    ],
    faq: [
      {
        q: "What exactly is removed?",
        a: "Everything outside the pixels: EXIF, GPS coordinates, camera and lens details, timestamps, maker notes, the embedded preview thumbnail and any colour profile. The image is rebuilt from its pixels, so nothing from the original container carries over.",
      },
      {
        q: "Will my photograph end up sideways?",
        a: "No. The orientation tag is applied to the pixels before it is discarded, so the image stays as it appeared. That is the point at which a naive stripper gets it wrong.",
      },
      {
        q: "Why does the hidden thumbnail matter?",
        a: "Because some editors update the main image and leave the embedded preview untouched. A photograph cropped to hide something can still contain a thumbnail of the original, and extracting it is trivial. Re-encoding eliminates it.",
      },
      {
        q: "Does this lose image quality?",
        a: "A JPEG goes through one more compression cycle, which is slight but real. Saving as PNG avoids it entirely at the cost of a larger file.",
      },
    ],
  },

  "blur-image-area": {
    intro: `Publishing a screenshot means publishing everything in it. An email address in a sidebar, a customer name in a list, a token in a URL bar, a colleague's face in the background. Obscuring those parts before the picture goes anywhere is a small step that prevents an irreversible one.

This blurs or pixelates a region you draw over the image, and it does it destructively — the pixels underneath are replaced, not covered. That distinction is the whole point of using a tool like this rather than drawing a black rectangle in a document.

A rectangle drawn over text in a PDF or a presentation is an object sitting on a layer, and the text beneath it is still in the file. Moving the rectangle, or extracting the content, recovers what it was hiding. That failure has embarrassed government departments, law firms and newspapers, repeatedly and publicly. Here the region is rewritten in the image data, and there is nothing underneath to recover.

Pixelation deserves a caution that blurring does not. A heavily pixelated region of known text — a card number, a postcode, a name from a limited set — can sometimes be reversed by generating candidates and pixelating each until one matches. Blurring at a strong radius destroys more information and is the safer choice for anything that matters. For a face, either works; for a short string with predictable structure, blur.

Do the obscuring before the image is shared rather than after. Once a file has been sent, edited copies do not recall the original, and the version that matters is the one that already arrived.`,
    steps: [
      "Drop in the screenshot or photograph.",
      "Draw over each region that needs hiding. Several areas can be marked on one image.",
      "Choose blur rather than pixelation for short predictable text such as a card number or a postcode.",
      "Turn the strength up further than looks necessary, then download and check the result at full size.",
    ],
    faq: [
      {
        q: "Can the blurred content be recovered?",
        a: "Not from a strong blur — the information is genuinely destroyed in the pixel data. Heavy pixelation of predictable text is weaker, since candidates can be generated and compared. Use blur when the hidden text has a known format.",
      },
      {
        q: "Why not just draw a black box in a document?",
        a: "Because in most document formats the box is an object on top and the content is still underneath, recoverable by moving it or extracting the text. This rewrites the pixels, so there is nothing left below.",
      },
      {
        q: "How strong should the blur be?",
        a: "Stronger than looks necessary. If the shape of the letters is still discernible, the radius is too low. There is no cost to overdoing it.",
      },
      {
        q: "Is the image uploaded?",
        a: "No. It is decoded onto a canvas here and the blur is applied in this tab, which matters more than usual given that the whole reason you are here is that the picture contains something sensitive.",
      },
    ],
  },

  "color-palette-extractor": {
    intro: `Pulling the dominant colours out of an image is how a design gets tied to a photograph, how a brand palette gets derived from a logo, and how a page gets a background that belongs with its hero image.

This samples the picture and reports the colours it is actually built from, as hex, RGB, HSL or as CSS custom properties, alongside a swatch strip you can check by eye.

The algorithm is median cut rather than averaging or k-means, and the difference is visible. Averaging a photograph gives you brown, every time, because averaging distant colours lands in the middle of the colour space. K-means gives slightly better centroids but needs several passes and a starting guess. Median cut repeatedly divides the colours into boxes along their widest axis and takes the centre of each, which returns the colours the image is composed of rather than a blend of them.

Near-white and near-black are filtered out by default, and that filter is doing more work than it appears. Most photographs are substantially sky or shadow and almost every screenshot is mostly background, so without it the palette comes back as five shades of off-white and one real colour. The filter can be switched off when the background genuinely is the subject.

The sampling runs on a scaled copy of the image, which makes the result identical on a phone and a laptop and fast on both. Colours are ordered by lightness so the strip reads as a ramp.

One thing to check before using a pair as text on background: run them through a contrast checker. A palette that came from a photograph has no obligation to be accessible.`,
    steps: [
      "Drop in the image you want a palette from.",
      "Choose how many colours to extract — five or six is usually enough to characterise a picture.",
      "Leave the near-white and near-black filter on unless the background is genuinely the subject.",
      "Download the swatch to check by eye, and test any text-on-background pairing for contrast before using it.",
    ],
    faq: [
      {
        q: "Why not just average the colours?",
        a: "Because averaging distant colours lands in the middle of the colour space, which is brown. Median cut divides the colours into groups first and reports the centre of each, so you get the colours present rather than a blend of them.",
      },
      {
        q: "Why is the white background not in my palette?",
        a: "It is filtered out by default, because most images are mostly background and the palette would otherwise be several shades of off-white. Switch the filter off to include it.",
      },
      {
        q: "How many colours should I extract?",
        a: "Five or six characterises most images. More than eight and the extra entries are usually variations of ones already listed rather than distinct colours.",
      },
      {
        q: "Are the colours accessible for text?",
        a: "Not necessarily. A palette taken from a photograph reflects the photograph, not any contrast requirement. Check any pairing you intend to use for text against a contrast checker before relying on it.",
      },
    ],
  },

  "favicon-generator": {
    intro: `A favicon is not one file any more. A browser tab wants a small icon, an iOS home screen wants a 180-pixel Apple touch icon, Android wants several sizes described in a web manifest, and Windows tiles want their own. Producing all of them by hand from one source is tedious and easy to leave half-done.

This takes one high-resolution image and generates the set, sized correctly for each destination.

The design constraint that matters is that a favicon is rendered at sixteen pixels square. At that size a logo with a wordmark is an illegible smudge, and detail of any kind disappears entirely. What works is one shape or one letter, high contrast, filling the frame. Take your logo, shrink it to sixteen pixels, and look at it — if you cannot tell what it is, neither can anyone else, and the icon needs to be a simplified mark rather than the full logo.

Supply a square source at 512 pixels or larger. Downscaling produces clean results and upscaling does not, so a small source gives soft icons at every size in the set.

Transparent backgrounds work in a browser tab, where the surrounding chrome varies. They do not work on an iOS home screen, which composites the icon onto white and can leave a visible edge. Supplying a solid background colour avoids that.

The generated files come with the markup to reference them, which is where most incomplete implementations fall down — the files exist on the server and nothing in the page points at them.`,
    steps: [
      "Upload a square source image, ideally 512 pixels or larger.",
      "Check it at sixteen pixels: if the mark is not recognisable there, simplify the artwork before generating.",
      "Set a background colour if the source is transparent, since iOS composites onto white.",
      "Download the set and add the generated link tags to the head of every page, not only the home page.",
    ],
    faq: [
      {
        q: "What size should my source image be?",
        a: "Square and at least 512 pixels, larger if you have it. Every icon in the set is produced by downscaling, which is clean; upscaling from a small source produces soft results everywhere.",
      },
      {
        q: "Why does my logo look like a blur in the tab?",
        a: "Because a favicon renders at sixteen pixels and a detailed logo has nowhere to put its detail. Use a single shape, letter or monogram at high contrast, filling the frame.",
      },
      {
        q: "Do I still need an .ico file?",
        a: "Only for genuinely old browsers. Modern ones read PNG icons from link tags, and the multi-resolution .ico is now a compatibility measure rather than a requirement.",
      },
      {
        q: "Should the background be transparent?",
        a: "In a browser tab, yes — it adapts to light and dark chrome. On an iOS home screen, no: the icon is composited onto white and a transparent edge shows. A solid background is the safer default.",
      },
    ],
  },

  "image-to-ascii": {
    intro: `Turning a picture into text characters is a technique older than graphical displays: sample the brightness of each region and substitute a character with roughly that visual density. A dense character such as @ reads as dark, a full stop reads as light, and a grid of them approximates the image.

This does that with a choice of character ramps and control over the output width.

The setting that determines whether the result is recognisable is the character aspect ratio, and it is the one most implementations get wrong. Text characters are roughly twice as tall as they are wide, so sampling the image on a square grid produces output stretched vertically to twice its proper height. Sampling half as many rows as columns corrects it, which is what the aspect control does — and it is why so much ASCII art on the web looks oddly elongated.

Ramp choice changes the character of the result. The classic ten-character ramp is legible at small sizes. The seventy-character detailed ramp gives smoother tonal gradation and needs a larger output to show it. Block characters produce solid shading that reads more like an image and less like text. Binary is a stylistic choice rather than a tonal one.

Source images matter more than settings. High contrast with a clear silhouette works; a busy photograph becomes noise, because ten levels of brightness cannot represent what the eye reads as texture. Portraits, logos and objects against plain backgrounds are what to reach for.

The output is built for a monospace font. In anything proportional the columns do not align and the picture collapses.`,
    steps: [
      "Drop in an image with good contrast and a clear subject.",
      "Set the output width in characters — 80 to 120 suits most screens and terminals.",
      "Leave the character shape control near 0.5, which compensates for text being taller than it is wide.",
      "Invert if the result will be displayed as light text on a dark background.",
    ],
    faq: [
      {
        q: "Why does my ASCII art look stretched?",
        a: "Because the image was sampled on a square grid while text characters are about twice as tall as they are wide. The character shape control corrects for it, and 0.5 is the usual value.",
      },
      {
        q: "Which character ramp should I use?",
        a: "The classic ramp for small output, the detailed seventy-character one when the output is large enough to show the extra tones, and block characters when you want solid shading rather than something that reads as text.",
      },
      {
        q: "Why is my photograph unrecognisable?",
        a: "Because a busy image has more texture than ten brightness levels can represent. High-contrast subjects with a clear outline work; complex scenes become noise at any width.",
      },
      {
        q: "Why does it look wrong when I paste it somewhere?",
        a: "The destination is using a proportional font. Every character must occupy the same width for the columns to line up — use a monospace font, or a code block if the destination supports one.",
      },
    ],
  },

  "meme-generator": {
    intro: `The impact-text meme format — heavy white capitals with a black outline, top and bottom — has a specific look that is instantly recognisable, and reproducing it in an image editor takes longer than the joke is worth.

This adds that text to any image you drop in, with the outline, the sizing and the placement that make it read correctly.

The outline is what makes the format work rather than a stylistic flourish. White text on a photograph is unreadable over a light area and invisible over a bright one; the black stroke around each letter guarantees legibility over anything. That is why the convention exists and why text without it looks wrong even when the font is right.

Sizing follows a similar logic. Meme text is large because the image is usually seen small, in a feed, on a phone, at thumbnail size. Text sized to look proportionate on a desktop is illegible where the image will actually be viewed. Err larger than feels comfortable.

Line breaks are worth placing by hand. Automatic wrapping breaks where the width runs out, which frequently splits a phrase in the wrong place and costs the timing. Breaking the line where the sense breaks is a small edit that makes a real difference.

The image is composited in this tab and downloaded from it, which means nothing you make here is uploaded, logged or moderated by anyone. Whatever you produce is yours and stays on your machine unless you send it somewhere.`,
    steps: [
      "Drop in the image you want to caption.",
      "Type the top and bottom text. Traditional capitals are optional but conventional.",
      "Size the text larger than looks right on a desktop, since the image will mostly be seen small.",
      "Place your own line breaks where the phrase breaks rather than letting it wrap wherever the width ends.",
    ],
    faq: [
      {
        q: "Why does the text have a black outline?",
        a: "So it stays readable over any part of the image. White text alone disappears over a light background, and the stroke removes the problem entirely, which is why the convention became standard.",
      },
      {
        q: "Can I use my own image?",
        a: "Yes — any image you drop in works. There is no template library and no gallery, because there is no server to hold one.",
      },
      {
        q: "How large should the text be?",
        a: "Larger than looks right at full size. Memes are viewed small, in feeds and on phones, and text sized for a desktop preview is unreadable where it will actually be seen.",
      },
      {
        q: "Is anything I make here uploaded?",
        a: "No. The image is composited on a canvas in this tab and downloaded directly from it. Nothing is transmitted, stored or moderated.",
      },
    ],
  },

  "photo-filters": {
    intro: `Adjusting brightness, contrast, saturation and hue is the ninety per cent of photo editing that does not need an application. This applies those adjustments in the browser, along with the preset looks — greyscale, sepia, high contrast — that are quicker to pick than to build.

The adjustments that improve a photograph most are the least dramatic ones. Slightly more contrast, slightly more saturation, and a small lift in brightness will do more for an ordinary picture than any filter, and the reason phone cameras apply exactly those by default is that they work.

Contrast is where a picture is usually won. A photograph shot in flat light has all its tones bunched in the middle and looks lifeless; pushing contrast spreads them out and the image looks like it was taken in better conditions. Push too far and the shadows go solid black and the highlights blow out, and neither can be recovered afterwards.

Saturation needs a lighter hand than instinct suggests. Slightly more looks vivid; much more looks artificial, and skin tones are where it shows first — they turn orange well before anything else in the frame looks wrong.

Greyscale is worth trying on any photograph that is not working. Removing colour removes a distraction, and an image with a strong shape or strong light often improves considerably. If it does not improve, colour was doing more work than it seemed.

Every adjustment is applied to the pixels and the result is re-encoded, so work from a copy and keep the original — none of this is reversible once the file is saved.`,
    steps: [
      "Drop in the photograph.",
      "Start with contrast, which is the adjustment that changes most pictures for the better.",
      "Add saturation sparingly, watching skin tones — they turn artificial first.",
      "Download the result, keeping the original file, since these adjustments cannot be undone afterwards.",
    ],
    faq: [
      {
        q: "Which adjustment helps most?",
        a: "Contrast. A photograph taken in flat light has its tones bunched together, and spreading them out is what makes an image look like it was shot in better conditions than it was.",
      },
      {
        q: "Why do my photographs look artificial?",
        a: "Too much saturation, almost always. Skin tones go orange before anything else in the frame looks wrong, so watch faces rather than the overall impression.",
      },
      {
        q: "Can I undo an adjustment after saving?",
        a: "No. The pixels are changed and re-encoded. Always work from a copy and keep the original file, which is the only version that still holds everything.",
      },
      {
        q: "When is black and white the right choice?",
        a: "When the picture depends on shape, light or expression rather than colour. It is worth trying on any photograph that is not quite working — often the colour was the distraction.",
      },
    ],
  },

  "remove-image-background": {
    intro: `Cutting the background out of an image is the everyday task behind a product listing, a profile picture on a coloured card, or a logo that has to sit on something other than white.

This removes a single flat background colour and replaces it with transparency. It is deliberate about its scope: it is not an AI cutout, and it will not separate a person from a cluttered room. What it does reliably is take an image with a uniform background — a logo on white, a product shot on a seamless backdrop, a screenshot, an icon — and make that colour transparent.

The tolerance setting is what makes that work in practice. A background that looks like one flat colour rarely is: JPEG compression introduces slight variation, and a photographed backdrop has gradients from the lighting. Tolerance decides how far from the chosen colour still counts as background. Too low and a halo of near-matching pixels survives around the subject. Too high and parts of the subject start disappearing, beginning with anything sharing a tone with the backdrop.

Edges are where flat-colour removal shows its limits. Anti-aliasing blends the subject into the background over a pixel or two, and those blended pixels are partly background — removing them leaves a hard edge, keeping them leaves a fringe. Fine detail such as hair is the hardest case and the one where a dedicated cutout tool earns its keep.

Save as PNG or WebP. JPEG has no alpha channel, and saving a cutout as JPEG fills the transparency with white, which undoes the entire operation.`,
    steps: [
      "Drop in an image with a reasonably uniform background.",
      "Pick the background colour, or let the tool take it from the corner pixels.",
      "Raise the tolerance until the halo disappears, then stop before the subject starts eroding.",
      "Save as PNG or WebP. Saving as JPEG discards the transparency and fills it with white.",
    ],
    faq: [
      {
        q: "Will this cut a person out of a photograph?",
        a: "Only if they are standing against a plain backdrop. This removes a flat colour rather than identifying a subject, so a cluttered background needs a dedicated cutout tool that understands what it is looking at.",
      },
      {
        q: "Why is there a coloured fringe around my subject?",
        a: "Anti-aliasing blends the edge into the background over a pixel or two, and those pixels are partly background. Raising the tolerance a little removes most of it; the remainder is the practical limit of colour-based removal.",
      },
      {
        q: "Parts of my subject disappeared.",
        a: "The tolerance is too high and is now matching colours within the subject. Lower it until the subject is intact, and accept a small halo as the trade.",
      },
      {
        q: "Why did my transparent background come out white?",
        a: "The result was saved as JPEG, which has no alpha channel and fills transparency with white. Save as PNG or WebP instead.",
      },
    ],
  },

  "remove-background-ai": {
    intro: `A photograph of a person in a room has no single backdrop colour to key out. The wall, the furniture, the light falling across all of it — none of that can be described as one value with a tolerance around it. Separating a subject from a scene like that requires something that has learned what subjects look like.

That is what runs here. U\u00B2-Net is a segmentation network trained to score every pixel on how strongly it belongs to the foreground, and it works on ordinary photographs: a person at a desk, a dog on grass, a chair against a patterned wall. Whatever it scores low is background, and out it goes. You get a PNG with the subject kept and everything behind it made transparent, or flattened onto a colour of your choosing.

The unusual part is where the work happens. Hosted cutout services send your picture to their servers, and their privacy policies are about what they promise to do with it afterwards. Here the model is downloaded to your browser and the picture is examined on your own machine. There is no upload, so there is no promise to evaluate — a difference that matters for an ID photograph, a passport scan, a picture of a child, or anything from work.

The price of that is a first run which fetches roughly seven megabytes of model and runtime. Your browser keeps them, so every image after the first starts immediately, and the tool then works with the network switched off entirely.

Two sliders exist because no automatic mask is perfect. Tightness moves the line between subject and background when a rim of the old scene survives or an edge has been shaved off. Softness blurs the cut by a pixel or two, which is what stops a composite looking pasted on.`,
    steps: [
      "Drop in a photograph. Portraits, pets, products and objects with a clear subject all work; a crowd or a reflection will not.",
      "Wait out the one-time model download on the first run. Later images skip it.",
      "Choose transparency or a backdrop colour, then nudge tightness if a rim of the old scene survives.",
      "Download the PNG. Transparency needs a format that carries an alpha channel, which is why there is no JPEG option here.",
    ],
    faq: [
      {
        q: "Does my photograph get uploaded anywhere?",
        a: "No. The model file travels to your browser and the picture stays put, which is the reverse of how a hosted cutout service works. You can prove it by disconnecting from the network after the first run — the tool carries on working.",
      },
      {
        q: "Why is the first run slow?",
        a: "It is fetching about seven megabytes: the neural network itself plus the WebAssembly that executes it. Both are cached permanently by your browser afterwards, so the wait happens once rather than once per image.",
      },
      {
        q: "How does this compare with a paid online remover?",
        a: "Close on a clear subject, and behind on the hard cases. Wispy hair, glass, motion blur and overlapping people are where a much larger commercial model still wins. The compensation is that this one costs nothing, has no daily limit, and never sees your picture.",
      },
      {
        q: "When should I use the flat-colour version instead?",
        a: "Whenever the backdrop really is one shade \u2014 a logo, an icon, a screenshot, a product on a seamless sweep. Keying a known colour is instant, needs no download, and gives a cleaner edge than any model will.",
      },
      {
        q: "The subject came out with a hole in it. What now?",
        a: "Pull tightness below zero. That widens what counts as foreground and usually recovers a dark region the network read as shadow. If the picture has two subjects and only one survived, the network chose the dominant one and cannot be told otherwise.",
      },
    ],
  },
};
