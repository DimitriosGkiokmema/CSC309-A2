var map = L.map('map').setView([43.6617, -79.397108], 15);
var marker = L.marker([43.66137058152606, -79.39710894938374]).addTo(map);
marker.bindPopup("<b>Varsity Mart</b><br>Your UofT grocer").openPopup();


L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 25,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);