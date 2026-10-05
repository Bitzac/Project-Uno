#!/usr/bin/env bash
# 下载渲染依赖（不入库）：three.js r186 与 Michelle 角色（含 SambaDance 动捕）-> web/vendor/
set -euo pipefail
cd "$(dirname "$0")"
V=0.186.1
NPM="https://cdn.jsdelivr.net/npm/three@$V"
GH="https://raw.githubusercontent.com/mrdoob/three.js/r186"
d=web/vendor
mkdir -p $d/three/build $d/three/examples/jsm/{loaders,utils,objects,environments} $d/models
get() { [ -s "$2" ] || curl -fsSL --retry 4 -o "$2" "$1"; }
for f in three.module.js three.core.js; do get "$NPM/build/$f" "$d/three/build/$f"; done
for f in loaders/GLTFLoader.js utils/BufferGeometryUtils.js utils/SkeletonUtils.js objects/Reflector.js environments/RoomEnvironment.js; do
  get "$NPM/examples/jsm/$f" "$d/three/examples/jsm/$f"
done
get "$GH/examples/models/gltf/Michelle.glb" "$d/models/Michelle.glb"
ls -la $d/models
