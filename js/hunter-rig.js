/* hunter-rig.js
 * Анимация охотника ПО ЧАСТЯМ для hunter_light.glb (в модели нет скелета).
 * Модель: один узел, один меш, 11 примитивов. Роли частей (по порядку примитивов):
 *   0 туловище+плащ   1 правая рука (+Z)   2 левая рука (-Z)   3 голова+шляпа
 *   4 правая нога     5 пистолет (в левой) 6 левая нога        7 задняя деталь/лямка
 *   8 пила-тесак (в правой)  9 левая кисть  10 правая кисть
 * Оси модели: вперёд = -X, вверх = +Y, боковая = Z.
 * Поворот вокруг Z: ПОЛОЖИТЕЛЬНЫЙ = назад для свисающих вниз конечностей, для корпуса = наклон вперёд.
 *
 * Использование:
 *   const rig = HunterRig.build(gltf.scene);   // null, если структура не 11 частей
 *   modelRoot.add(rig.root);                   // modelRoot уже повёрнут так, что -X модели смотрит вперёд (+Z игры)
 *   каждый кадр: rig.update(dt, { speed, action, t });
 *     speed  — скорость героя в единицах игры в секунду
 *     action — 'idle' | 'attack' | 'shoot' | 'dodge' | 'heal'
 *     t      — прогресс действия 0..1 (для idle игнорируется)
 * Высота модели нормируется до 1.95, ноги на y = 0.
 */
const HunterRig = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  function build(scene) {
    const parts = [];
    scene.traverse(o => { if (o.isMesh) parts.push(o); });
    if (parts.length !== 11) return null;

    // Трансформ узла (квантованные позиции + масштаб узла)
    const node = parts[0].parent;
    const S = node.scale.x, T = node.position;
    let minY = Infinity, maxY = -Infinity;
    for (const m of parts) {
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox;
      minY = Math.min(minY, b.min.y * S + T.y);
      maxY = Math.max(maxY, b.max.y * S + T.y);
    }
    const K = 1.95 / (maxY - minY);
    const off = [T.x * K, (T.y - minY) * K, T.z * K]; // положение начала мешей в единицах игры

    // Держатель в суставе J (координаты в единицах игры, ноги на y=0), PJ — сустав родителя
    function mk(ids, J, parent, PJ) {
      const h = new THREE.Group();
      h.position.set(J[0] - PJ[0], J[1] - PJ[1], J[2] - PJ[2]);
      for (const i of ids) {
        const m = parts[i];
        if (m.parent) m.parent.remove(m);
        h.add(m);
        m.position.set(off[0] - J[0], off[1] - J[1], off[2] - J[2]);
        m.rotation.set(0, 0, 0);
        m.scale.setScalar(S * K);
        m.frustumCulled = false;
      }
      parent.add(h);
      return h;
    }

    const PIV_Y = 0.95;                         // центр масс для переката
    const pivot = new THREE.Group();
    pivot.position.y = PIV_Y;
    const rig = new THREE.Group();
    rig.position.y = -PIV_Y;
    pivot.add(rig);

    const B = [0, 1.0, 0];                      // поясница: корпус наклоняется и скручивается вокруг неё
    const body = mk([0, 7], B, rig, [0, 0, 0]);
    const head = mk([3], [-0.10, 1.55, 0.105], body, B);
    const armR = mk([1, 10, 8], [0.01, 1.50, 0.30], body, B);   // рука с пилой-тесаком
    const armL = mk([2, 9, 5], [0.01, 1.55, -0.28], body, B);   // рука с пистолетом
    const legR = mk([4], [-0.02, 1.02, 0.105], rig, [0, 0, 0]);
    const legL = mk([6], [-0.08, 1.05, -0.085], rig, [0, 0, 0]);

    // Текущие значения (сглаживаются к целевым)
    const cur = { lr: 0, ll: 0, ar: 0, al: 0, lean: 0, twist: 0, head: 0, y: PIV_Y };
    let ph = 0, time = 0, roll = 0;

    function update(dt, s) {
      time += dt;
      const sp = clamp((s.speed || 0) / 6, 0, 1);
      if (sp > 0.05) ph += dt * (5 + sp * 7);
      const sw = Math.sin(ph);
      const act = s.action || 'idle';
      const t = clamp(s.t || 0, 0, 1);

      // Базовая поза: стоим / идём / бежим
      const tg = {
        lr: sw * 0.9 * sp, ll: -sw * 0.9 * sp,
        ar: -sw * 0.30 * sp, al: sw * 0.40 * sp,
        lean: 0.04 + 0.22 * sp + Math.sin(time * 1.6) * 0.012,
        twist: sw * 0.10 * sp,
        y: PIV_Y + Math.abs(sw) * 0.05 * sp + Math.sin(time * 1.6) * 0.006
      };
      let rate = 16, rolling = false;

      if (act === 'attack') {
        rate = 30;
        if (t < 0.41) {                                   // замах
          const u = smooth(t / 0.41);
          tg.ar = -2.7 * u; tg.lean = -0.15 * u + 0.04 * (1 - u); tg.twist = 0.5 * u;
          tg.ll = 0.3 * u; tg.lr = -0.2 * u;
        } else if (t < 0.65) {                            // удар
          const v = smooth((t - 0.41) / 0.24);
          tg.ar = -2.7 + 1.7 * v; tg.lean = -0.15 + 0.6 * v; tg.twist = 0.5 - 0.95 * v;
          tg.ll = -0.5 * v + 0.3 * (1 - v); tg.lr = 0.4 * v - 0.2 * (1 - v);
        } else {                                          // возврат
          const w = smooth((t - 0.65) / 0.35);
          tg.ar = -1.0 * (1 - w); tg.lean = 0.45 * (1 - w) + 0.1 * w; tg.twist = -0.45 * (1 - w);
          tg.ll = -0.5 * (1 - w); tg.lr = 0.4 * (1 - w);
        }
      } else if (act === 'shoot') {
        rate = 30;
        const up = smooth(t * 5), down = smooth((t - 0.7) / 0.3);
        const recoil = t > 0.25 ? 0.28 * Math.exp(-(t - 0.25) * 14) : 0;
        tg.al = -1.5 * up * (1 - down) + recoil;
        tg.lean = 0.04 - recoil * 0.3; tg.twist = -0.15 * up * (1 - down);
        tg.head = -0.05;
      } else if (act === 'heal') {
        rate = 12;
        tg.al = -2.1 * smooth(t * 4) * (1 - smooth((t - 0.85) / 0.15));
        tg.lean = -0.08; tg.head = -0.25 * smooth(t * 4);
      } else if (act === 'dodge') {
        rate = 25; rolling = true;
        roll = t * Math.PI * 2;                           // кувырок вперёд
        tg.lr = -1.3; tg.ll = -1.3; tg.ar = -0.6; tg.al = -0.9; tg.lean = 0.5;
        tg.y = PIV_Y - 0.1;
      }
      if (!rolling) roll = 0;

      const a = 1 - Math.exp(-dt * rate);
      for (const k in tg) cur[k] += (tg[k] - cur[k]) * a;
      if (!('head' in tg)) cur.head += (0 - cur.head) * a;

      legR.rotation.z = cur.lr;
      legL.rotation.z = cur.ll;
      armR.rotation.z = cur.ar;
      armL.rotation.z = cur.al;
      body.rotation.z = cur.lean;
      body.rotation.y = cur.twist;
      head.rotation.z = -cur.lean * 0.6 + cur.head;
      head.rotation.y = -cur.twist * 0.7;
      pivot.rotation.z = roll;
      pivot.position.y = cur.y;
    }

    return { root: pivot, update, parts, height: 1.95 };
  }

  return { build };
})();
