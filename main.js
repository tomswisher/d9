import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import 'd3';

'use strict';

function getStageWidth() {
    return Math.min(512, window.innerWidth);
};

function getStageHeight() {
    return Math.min(512, window.innerHeight);
};

function getAspectRatio() {
    return getStageWidth() / getStageHeight();
};

function animate() {
    if (window.animating === false) { return; }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

function updateBars(data) {
    if (window.updating === false) { return; }
    console.log('updateBars', data);
    const duration = 2000;

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.population)])
        .range([0, 1]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.population)])
        .range([0, 1]);

    const join = customContainer.selectAll('bar')
        .data(data, (d, i) => d.value);

    join.enter()
        .append('bar')
        .each(function(d, i, nodes) {
            console.log('enter', i);
            const group = new THREE.Group();
            group.name = 'bar';
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            // const material = new THREE.MeshPhongMaterial({ color: color, transparent: true, opacity: 0 });
            const material = new THREE.MeshBasicMaterial({
                color: d.color,
                transparent: true,
                opacity: 1,
            });
            const barMesh = new THREE.Mesh(geometry, material);
            barMesh.position.x = i;
            barMesh.position.y = yScale(d.population) / 2;
            barMesh.scale.set(1, 0, 1);
            barMesh.userData = {
                targetY: yScale(d.population) / 2,
                targetOpacity: 1,
            };
            barMeshes.push(barMesh);
            group.add(barMesh);
            scene.add(group);
            // scene.add(barMesh);
            nodes[i].group = group;
        });
    
    join
        .each((d, i, nodes) => {
            const barMesh = nodes[i].group.children[0];
            console.log('update', i, barMesh.userData);
            barMesh.userData.targetX = i;
            barMesh.userData.targetY = yScale(d.population) / 2;
            barMesh.userData.targetHeight = yScale(d.population);
            barMesh.userData.targetOpacity ^= 1;
            barMesh.material.color.set(d.color);
            barMesh.position.y = yScale(d.population) / 2;
            barMesh.scale.set(1, yScale(d.population), 1);
        });

    join.exit()
        .each((d, i, nodes) => {
            console.log('exit', i);
            const barMesh = nodes[i].group.children[0];
            barMesh.userData.targetOpacity = 0;
            setTimeout(() => {
                scene.remove(barMesh);
                barMeshes = barMeshes.filter((b) => b !== barMesh);
            }, duration)
        });

    // Animate the bars
    barMeshes.forEach((barMesh) => {
        d3.select(barMesh.material).transition().duration(duration)
            // .tween('opacity', () => (t) => barMesh.material.opacity = d3.interpolate(barMesh.material.opacity, barMesh.userData.opacity)(t));
            .tween('opacity', () => {
                return (t) => {
                    // console.log(barMesh.material.opacity, barMesh.userData.targetOpacity);
                    barMesh.material.opacity = d3.interpolate(barMesh.material.opacity, barMesh.userData.targetOpacity)(t);
                };
            });
            // .tween('opacity', () => {
            //     return (t) => {
            //         // console.log(t, barMesh.material.opacity, barMesh.userData.opacity, d3.interpolate(barMesh.material.opacity, barMesh.userData.opacity)(t));
            //         return barMesh.material.opacity = d3.interpolate(barMesh.material.opacity, barMesh.userData.opacity)(t);
            //     };
            // });

        d3.select(barMesh.position).transition().duration(duration)
            .tween('position', () => {
                return (t) => {
                    // console.log(t, barMesh.position.y, barMesh.userData.targetY, d3.interpolate(barMesh.position.y, barMesh.userData.targetY)(t));
                    const newX = d3.interpolate(barMesh.position.x, barMesh.userData.targetX)(t);
                    const newY = d3.interpolate(barMesh.position.y, barMesh.userData.targetY)(t);
                    const newHeight = d3.interpolate(barMesh.scale.getComponent(1), barMesh.userData.targetHeight)(t);
                    if (newX !== undefined) {
                        barMesh.position.x = newX;
                    }
                    // barMesh.position.x = newX;
                    barMesh.position.y = newY;
                    barMesh.scale.set(1, newHeight, 1);
                };
            });
    });

    animate();
}

window.THREE = THREE;
window.animating = true;
window.updating = true;

const scene = new THREE.Scene();
window.scene = scene;
scene.background = new THREE.Color(0xffffff);

// const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
const camera = new THREE.OrthographicCamera(-10 * getAspectRatio(), 10 * getAspectRatio(), 10, -10, 0.1, 100);
window.camera = camera;
camera.position.set(1, 1, 1);
// camera.lookAt(0, 0, 0);
// camera.rotation.set(-Math.PI/2, 0, 0);

const renderer = new THREE.WebGLRenderer();
window.renderer = renderer;
renderer.setSize(getStageWidth(), getStageHeight());
const container = document.querySelector('#container');
// container.addEventListener('click', (e) => {
//     console.log(e);
//     window.animating = !window.animating;
// });
container.appendChild(renderer.domElement);

const light = new THREE.PointLight(0xffffff);
light.position.set(10, 10, 10);
scene.add(light);

// camera.position.set(0, 0, 10);
// camera.lookAt(0, 0, 0);
window.addEventListener('resize', () => {
    camera.aspect = getAspectRatio();
    camera.updateProjectionMatrix();
    renderer.setSize(getStageWidth(), getStageHeight());
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

const customContainer = d3.select(document.createElement('custom'));
let barMeshes = [];
window.barMeshes = barMeshes;

let data = [
    { value: 'USA', color: 'red', population: 320 },
    { value: 'France', color: 'green', population: 66 },
    { value: 'Japan', color: 'blue', population: 127 },
];

updateBars(data);

setInterval(() => {
    // Fisher-Yates https://blog.codinghorror.com/the-danger-of-naivete/
    for (let i=0; i<data.length; i++) {
        data[i].population = Math.random() * 300;
        const j = Math.floor(Math.random() * (i + 1));
        [data[i], data[j]] = [data[j], data[i]];
    }
    updateBars(data);
}, 1000);
