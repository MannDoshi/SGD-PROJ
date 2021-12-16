var mymap = L.map('map').setView([41.8781,-87.6298],11);

const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const tiles = L.tileLayer(tileURL, { attribution });
//console.log(category);
tiles.addTo(mymap);

for(let i=0;i<cases.length;i++){
    marker = new L.marker([cases[i].lat,cases[i].long]);
    marker.bindPopup('Hi' + cases[i].id.low).addTo(mymap);
}
