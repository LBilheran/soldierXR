# soldierXR

Commande :

```bash
ngrok http http://localhost:5173
```

DuckDuckGo : qr url

Robot VS Michelle:
Add Robots to have a larger group than Michelle's (dancer) group, and blow up your opponent to move to the next size!
You can turn on music to enjoy the game more!

Project main objective: GLTF/GLB model instancing.

Features:

- Lights and Shadows
- Controls
- Background (RGBE)
- GUI

The game is downloadable on phone!

## Live Demo

Results: https://lbilheran.github.io/soldier-project/

![Alt text](./public/images/soldier-project_view.png?raw=true "Result")

## Phone installation

- Go to https://lbilheran.github.io/soldier-project/ on your phone (Chrome is the best option, maybe it doesn't work on other browsers).
- Click on the three dots and click on "Add to home screen".
- Click "Install" to play offline ! Or, create a shorcut to go to the site faster.

/!\ If you play the game on the website, maybe you will have to delete the cache before install the app.

## Local installation

First, clone this repository locally.
Then, run these commands:

- Install packages:

```bash
npm install
```

- Load the game locally:

```bash
npm run dev
```

- Open the following address on a browser (Firefox for example): http://localhost:5173/soldier-projet/

## Sources

- Three JS examples:

  - Robot, animation and GUI: https://threejs.org/examples/#webgl_animation_skinning_morph
  - Michelle and instancing: https://threejs.org/examples/?q=inst#webgpu_skinning_instancing
  - JSON and instancing: https://threejs.org/examples/?q=inst#webgpu_instance_mesh
  - Lights and Shadows: https://threejs.org/examples/?q=light#webgl_lights_hemisphere
  - Background (RGBE): https://threejs.org/examples/#webgl_materials_cubemap_dynamic

- Musique: Age of War (Video Game)

## Thanks

I would like to thank my teacher, Fivos Doganis, for this course and this WEB 3D project.
Thanks for all the people who created the Three JS examples and models.
