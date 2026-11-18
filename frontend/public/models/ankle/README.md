# Ankle model

`ankle.bin` is the right ankle the classifier's anatomy figure renders in its front, side and
3D views: the distal 100 mm of the tibia and fibula, and the talus.

## Source

BodyParts3D 3.0, The Database Center for Life Science (DBCLS), Japan.
<https://lifesciencedb.jp/bp3d/>

Archive: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_95.zip>
(polygon reduction rate 95%). Files used, with their SHA-256:

| File | Structure | SHA-256 |
| --- | --- | --- |
| FMA24477.obj | right tibia | d2cfed2382f0d92ee3274cc4726eab66ac833a8dd4d24f7bb06d34eca5e7652c |
| FMA24480.obj | right fibula | 0ba91890776c95639cdebbe586b00e0c5415aafbea888ac25fc0d4b3316627e0 |
| FMA24482.obj | right talus | 5c2d64a1b5fbb17373919b994c2fe1ede1629f9164b499fe4c509a9cd75b1cac |

## Licence

The OBJ files carry the header "BodyParts3D, Copyright(C) 2010-2011 The Database Center for
Life Science licensed under CC Attribution-Share Alike 2.1 Japan." The database's licence page
(<https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>, last updated 2025-02-27) now
grants CC BY 4.0 and asks for the attribution "BodyParts3D, © The Database Center for Life
Science licensed under CC Attribution 4.0 International".

`ankle.bin` is an adaptation and is released under CC BY-SA 4.0 (see `LICENSE`), which meets
both: BY-SA 2.1 Japan allows adaptations under a later version with the same licence elements,
and BY-SA 4.0 keeps the attribution CC BY 4.0 requires. This licence covers the files in this
folder only; the Anklyze code stays under Apache 2.0.

Attribution: BodyParts3D, © The Database Center for Life Science, licensed under CC BY-SA 2.1
Japan and CC BY 4.0. Cut, refined and tagged for Anklyze; this adaptation CC BY-SA 4.0.

## Changes

`frontend/scripts/build-ankle-model.mjs` makes `ankle.bin` from the three files above:

- rotates BodyParts3D axes (+x left, +y posterior, +z superior) to +x medial, +y superior,
  +z anterior, with the origin on the tibial plafond over the talar dome;
- cuts the tibia and fibula 100 mm above the plafond and closes each cut;
- closes the small holes in the source meshes (on the talus they showed as dark pits);
- refines the meshes, already 95% reduced in the archive, with one Loop subdivision step so they
  shade smooth;
- tags the lateral malleolus (fibula below the plafond), medial malleolus (tibia below the
  plafond, medial to the talar facet) and posterior malleolus (posterior 30% of the tibia
  within 12 mm of the plafond), and stores those planes so the viewer draws each boundary
  per pixel;
- measures the top of the syndesmosis (the first level where the fibula stands more than 4 mm
  clear of the tibia) and the fibular level bands;
- bakes ambient occlusion per vertex (the share of nearby surface in front of each vertex, on
  every bone), so creases and the joint spaces shade darker;
- quantises positions to 0.05 mm.

Rebuild with `cd frontend && node scripts/build-ankle-model.mjs` (fetches the three files with
HTTP range requests and checks the hashes) or pass a folder that holds them.
