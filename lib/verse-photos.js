// Nature photographs behind the memory verse (point 11). Free to use under the Unsplash Licence
// (https://unsplash.com/license); loaded from Unsplash's image CDN, sized for phones, and cached by the
// service worker so a verse seen once still shows its photo offline.
export const VERSE_PHOTOS = [
  { id: '1501785888041-af3ef285b470', alt: 'Turquoise lake below mountains' },
  { id: '1470071459604-3b5ec3a7fe05', alt: 'Misty green hills at sunrise' },
  { id: '1441974231531-c6227db76b6e', alt: 'Sunlight through a tall forest' },
  { id: '1506744038136-46273834b3fb', alt: 'River valley with pine trees at dusk' },
  { id: '1469474968028-56623f02e42e', alt: 'Golden light over mountain grassland' },
  { id: '1447752875215-b2761acb3c5d', alt: 'Wooden bridge into a green forest' },
  { id: '1433086966358-54859d0ed716', alt: 'Waterfall in a mossy gorge' },
  { id: '1426604966848-d7adac402bff', alt: 'Granite cliffs above a meadow' },
  { id: '1418065460487-3e41a6c84dc5', alt: 'Fog over a pine forest' },
  { id: '1465146344425-f00d5f5c8f07', alt: 'Red poppies in a field' },
  { id: '1500534314209-a25ddb2bd429', alt: 'Layered blue hills in soft light' },
  { id: '1507525428034-b723cf961d3e', alt: 'Calm beach at sunrise' },
  { id: '1439066615861-d1af74d74000', alt: 'Wooden jetty on a still lake' },
  { id: '1475924156734-496f6cac6ec1', alt: 'Pink sky over the sea' },
  { id: '1490750967868-88aa4486c946', alt: 'Yellow wildflowers in the sun' },
  { id: '1464822759023-fed622ff2c3b', alt: 'Snowy mountains above a valley' },
  { id: '1502082553048-f009c37129b9', alt: 'A lone tree on a green hill' },
  { id: '1510784722466-f2aa9c52fff6', alt: 'Sunset through tall grass' },
];

export function photoFor(index) {
  const p = VERSE_PHOTOS[((index % VERSE_PHOTOS.length) + VERSE_PHOTOS.length) % VERSE_PHOTOS.length];
  const base = `https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&q=70`;
  return { ...p, src: `${base}&w=900&h=700`, small: `${base}&w=480&h=240` };
}
