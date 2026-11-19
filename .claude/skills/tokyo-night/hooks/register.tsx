import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

const SCENE = 'skyline'

// Tokyo Night by night, Tokyo Night Day by day.
const { theme, problems } = makeColors({
  label: 'Tokyo Night',
  id: 'tokyo-night',
  // Every color below is from the Tokyo Night VS Code theme.
  roles: { accent: '#7aa2f7', danger: '#f7768e', success: '#9ece6a', warning: '#e0af68', pro: '#bb9af7' },
  codeTheme: { dark: 'tokyo-night' },
  dark: {
    gray: {
      anchors: {
        // Flat across the first three, at Night's own background, so the
        // panels read as one surface and sit close to the app's dark chrome.
        'surface-0': '#1a1b26',
        'surface-1': '#1a1b26',
        'surface-2': '#1a1b26',
        'surface-3': '#262a3c',
        'text-primary': '#c0caf5',
        'text-secondary': '#a9b1d6',
        'text-muted': '#9aa5ce',
      },
    },
    git: {
      added: '#9ece6a',
      removed: '#f7768e',
      modified: '#e0af68',
      merged: '#bb9af7',
      closed: '#f7768e',
      conflicting: '#ff9e64',
      draft: '#9aa5ce',
    },
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e6e7ed',
        'surface-1': '#eceef2',
        'surface-2': '#f4f5f8',
        'surface-3': '#f4f5f8',
        'text-primary': '#343b58',
        'text-secondary': '#474c63',
        'text-muted': '#646770',
      },
    },
    roles: { accent: '#2959aa', danger: '#8c4351', success: '#385f0d', warning: '#8f5e15', pro: '#5a3e8e' },
    git: {
      added: '#385f0d',
      removed: '#8c4351',
      modified: '#8f5e15',
      merged: '#5a3e8e',
      closed: '#8c4351',
      conflicting: '#965027',
      draft: '#646770',
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: SCENE, glass: { blur: 22, opacity: 0.68 } },
}

const ART = String.raw`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<style>
:root{
  --sky-0:#16161e; --sky-1:#1a1b26; --sky-2:#24283b; --sky-3:#292e42;
  --halo:#7aa2f7; --halo-2:#bb9af7; --disc:#c0caf5; --disc-shade:#1a1b26;
  --star:#c0caf5; --stars-on:1; --shade-on:1;
  --far:#1f2335; --mid:#1a1b26; --near:#16161e;
  --win-a:#e0af68; --win-b:#7dcfff; --neon-a:#bb9af7; --neon-b:#7dcfff; --neon-c:#f7768e;
  --rail:#7dcfff; --cloud:#24283b;
}
@media (prefers-color-scheme: light){
  :root{
    --sky-0:#c4c8d4; --sky-1:#d6d9e2; --sky-2:#e6e7ed; --sky-3:#f0f1f5;
    --halo:#2959aa; --halo-2:#5a3e8e; --disc:#e8d9a8; --disc-shade:#e6e7ed;
    --star:#ffffff; --stars-on:0; --shade-on:0;
    --far:#aeb3c3; --mid:#9196a8; --near:#73788c;
    --win-a:#8f5e15; --win-b:#0f4b6e; --neon-a:#5a3e8e; --neon-b:#006c86; --neon-c:#8c4351;
    --rail:#2959aa; --cloud:#bcc1cf;
  }
}

.g0{stop-color:var(--sky-0)}
.g1{stop-color:var(--sky-1)}
.g2{stop-color:var(--sky-2)}
.g3{stop-color:var(--sky-3)}
.hz0{stop-color:var(--halo)}
.hz1{stop-color:var(--halo-2)}
.hz2{stop-color:var(--halo)}

.stars{opacity:var(--stars-on)}
.star{fill:var(--star)}
.tw-a{animation:tw-a 7s ease-in-out infinite}
.tw-b{animation:tw-b 11s ease-in-out infinite}
.tw-c{animation:tw-c 9s ease-in-out infinite}
.tw-d{animation:tw-d 13s ease-in-out infinite}
@keyframes tw-a{0%,100%{opacity:.9}50%{opacity:.25}}
@keyframes tw-b{0%,100%{opacity:.55}45%{opacity:.95}}
@keyframes tw-c{0%,100%{opacity:.7}30%{opacity:.2}70%{opacity:.85}}
@keyframes tw-d{0%,100%{opacity:.4}50%{opacity:.8}}

.disc{fill:var(--disc)}
.disc-shade{fill:var(--disc-shade);opacity:var(--shade-on)}
.halo{animation:breathe 24s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.3}50%{opacity:.55}}

.horizon{animation:breathe-2 32s ease-in-out infinite}
@keyframes breathe-2{0%,100%{opacity:.42}50%{opacity:.68}}

.cloud{fill:var(--cloud)}
.drift-a{animation:drift-a 150s linear infinite}
.drift-b{animation:drift-b 210s linear infinite}
.drift-c{animation:drift-c 180s linear infinite}
@keyframes drift-a{from{transform:translateX(-520px)}to{transform:translateX(1700px)}}
@keyframes drift-b{from{transform:translateX(-700px)}to{transform:translateX(1700px)}}
@keyframes drift-c{from{transform:translateX(1700px)}to{transform:translateX(-640px)}}

.far{fill:var(--far)}
.mid{fill:var(--mid)}
.near{fill:var(--near)}
.win-a{fill:var(--win-a)}
.win-b{fill:var(--win-b)}
.fl-a{animation:fl-a 17s steps(1,end) infinite}
.fl-b{animation:fl-b 23s steps(1,end) infinite}
.fl-c{animation:fl-c 29s steps(1,end) infinite}
@keyframes fl-a{0%,62%{opacity:.85}64%,78%{opacity:.08}80%,100%{opacity:.85}}
@keyframes fl-b{0%,30%{opacity:.18}32%,52%{opacity:.9}54%,100%{opacity:.18}}
@keyframes fl-c{0%,88%{opacity:.75}90%,96%{opacity:.1}98%,100%{opacity:.75}}

.neon-a{fill:var(--neon-a)}
.neon-b{fill:var(--neon-b)}
.neon-c{fill:var(--neon-c)}
.pulse-a{animation:pulse-a 6s ease-in-out infinite}
.pulse-b{animation:pulse-b 8s ease-in-out infinite}
.pulse-c{animation:pulse-c 5s ease-in-out infinite}
@keyframes pulse-a{0%,100%{opacity:.85}50%{opacity:.4}}
@keyframes pulse-b{0%,100%{opacity:.5}50%{opacity:.9}}
@keyframes pulse-c{0%,100%{opacity:.7}50%{opacity:.3}}

.beacon{fill:var(--neon-c);animation:beacon 4s ease-in-out infinite}
@keyframes beacon{0%,42%{opacity:.15}50%,58%{opacity:1}66%,100%{opacity:.15}}

.rail{fill:var(--rail);opacity:0;animation:rail 34s ease-in-out infinite}
@keyframes rail{0%,6%{opacity:0;transform:translateX(0)}12%{opacity:.75}70%{opacity:.75}78%,100%{opacity:0;transform:translateX(1180px)}}

.shoot{opacity:0;animation:shoot 46s ease-in infinite}
@keyframes shoot{0%,88%{opacity:0;transform:translate(0,0)}90%{opacity:.9}97%{opacity:0;transform:translate(-340px,190px)}100%{opacity:0;transform:translate(0,0)}}
.shoot-line{stroke:var(--star);stroke-width:2;stroke-linecap:round}
</style>

<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" class="g0" stop-color="#16161e"/>
<stop offset="0.42" class="g1" stop-color="#1a1b26"/>
<stop offset="0.76" class="g2" stop-color="#1f2335"/>
<stop offset="1" class="g3" stop-color="#292e42"/>
</linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" class="hz0" stop-color="#7aa2f7" stop-opacity="0.42"/>
<stop offset="1" class="hz0" stop-color="#7aa2f7" stop-opacity="0"/>
</radialGradient>
<linearGradient id="horizon" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" class="hz0" stop-color="#7aa2f7" stop-opacity="0"/>
<stop offset="0.3" class="hz1" stop-color="#bb9af7" stop-opacity="0.5"/>
<stop offset="0.62" class="hz2" stop-color="#7aa2f7" stop-opacity="0.55"/>
<stop offset="1" class="hz0" stop-color="#7aa2f7" stop-opacity="0"/>
</linearGradient>
<radialGradient id="glowpad" cx="0.5" cy="1" r="0.75">
<stop offset="0" class="hz1" stop-color="#bb9af7" stop-opacity="0.38"/>
<stop offset="1" class="hz1" stop-color="#bb9af7" stop-opacity="0"/>
</radialGradient>
</defs>

<rect x="0" y="0" width="1600" height="900" fill="url(#sky)"/>

<g class="stars">
<circle class="star tw-a" cx="112" cy="86" r="1.9" opacity=".9"/>
<circle class="star tw-b" cx="208" cy="152" r="1.3" opacity=".55"/>
<circle class="star tw-c" cx="286" cy="62" r="1.6" opacity=".7"/>
<circle class="star tw-d" cx="352" cy="214" r="1.1" opacity=".4"/>
<circle class="star tw-a" cx="430" cy="104" r="2.1" opacity=".9"/>
<circle class="star tw-c" cx="512" cy="178" r="1.4" opacity=".7"/>
<circle class="star tw-b" cx="596" cy="48" r="1.7" opacity=".55"/>
<circle class="star tw-d" cx="668" cy="236" r="1.2" opacity=".4"/>
<circle class="star tw-a" cx="742" cy="118" r="1.5" opacity=".9"/>
<circle class="star tw-c" cx="826" cy="72" r="1.9" opacity=".7"/>
<circle class="star tw-b" cx="902" cy="196" r="1.3" opacity=".55"/>
<circle class="star tw-d" cx="986" cy="132" r="1.6" opacity=".4"/>
<circle class="star tw-a" cx="1062" cy="56" r="1.2" opacity=".9"/>
<circle class="star tw-c" cx="1148" cy="222" r="1.8" opacity=".7"/>
<circle class="star tw-b" cx="1232" cy="96" r="1.4" opacity=".55"/>
<circle class="star tw-d" cx="1404" cy="60" r="1.7" opacity=".4"/>
<circle class="star tw-a" cx="1476" cy="188" r="1.3" opacity=".9"/>
<circle class="star tw-c" cx="1540" cy="118" r="1.9" opacity=".7"/>
<circle class="star tw-b" cx="64" cy="246" r="1.5" opacity=".55"/>
<circle class="star tw-d" cx="156" cy="318" r="1.2" opacity=".4"/>
<circle class="star tw-a" cx="248" cy="276" r="1.6" opacity=".9"/>
<circle class="star tw-c" cx="396" cy="342" r="1.3" opacity=".7"/>
<circle class="star tw-b" cx="474" cy="288" r="1.8" opacity=".55"/>
<circle class="star tw-d" cx="562" cy="356" r="1.1" opacity=".4"/>
<circle class="star tw-a" cx="704" cy="312" r="1.5" opacity=".9"/>
<circle class="star tw-c" cx="866" cy="348" r="1.4" opacity=".7"/>
<circle class="star tw-b" cx="1024" cy="292" r="1.7" opacity=".55"/>
<circle class="star tw-d" cx="1186" cy="358" r="1.2" opacity=".4"/>
<circle class="star tw-a" cx="1312" cy="282" r="1.6" opacity=".9"/>
<circle class="star tw-c" cx="1448" cy="336" r="1.3" opacity=".7"/>
<circle class="star tw-b" cx="1556" cy="268" r="1.8" opacity=".55"/>
<circle class="star tw-d" cx="332" cy="128" r="1.1" opacity=".4"/>
<circle class="star tw-a" cx="636" cy="164" r="1.2" opacity=".9"/>
<circle class="star tw-c" cx="946" cy="248" r="1.1" opacity=".7"/>
<circle class="star tw-b" cx="1104" cy="166" r="1.2" opacity=".55"/>
<circle class="star tw-d" cx="1364" cy="146" r="1.4" opacity=".4"/>
</g>

<g class="shoot">
<line class="shoot-line" x1="1380" y1="90" x2="1500" y2="26"/>
</g>

<ellipse class="halo" cx="940" cy="205" rx="235" ry="235" fill="url(#halo)" opacity=".3"/>
<circle class="disc" cx="940" cy="205" r="56" opacity=".95"/>
<circle class="disc-shade" cx="966" cy="187" r="48"/>

<g class="drift-a">
<ellipse class="cloud" cx="300" cy="300" rx="260" ry="26" opacity=".5"/>
<ellipse class="cloud" cx="420" cy="288" rx="150" ry="18" opacity=".38"/>
</g>
<g class="drift-c">
<ellipse class="cloud" cx="1100" cy="396" rx="320" ry="30" opacity=".45"/>
<ellipse class="cloud" cx="960" cy="382" rx="170" ry="20" opacity=".32"/>
</g>
<g class="drift-b">
<ellipse class="cloud" cx="700" cy="226" rx="200" ry="20" opacity=".3"/>
</g>

<rect x="0" y="420" width="1600" height="480" fill="url(#glowpad)" opacity=".7"/>

<g class="far">
<rect x="20" y="600" width="86" height="300"/>
<rect x="120" y="556" width="64" height="344"/>
<rect x="198" y="620" width="104" height="280"/>
<rect x="318" y="520" width="72" height="380"/>
<rect x="404" y="596" width="118" height="304"/>
<rect x="538" y="566" width="80" height="334"/>
<rect x="634" y="628" width="96" height="272"/>
<rect x="746" y="540" width="68" height="360"/>
<rect x="830" y="604" width="110" height="296"/>
<rect x="956" y="572" width="76" height="328"/>
<rect x="1048" y="624" width="100" height="276"/>
<rect x="1164" y="548" width="70" height="352"/>
<rect x="1250" y="612" width="114" height="288"/>
<rect x="1380" y="580" width="82" height="320"/>
<rect x="1478" y="632" width="104" height="268"/>
</g>
<rect class="horizon" x="0" y="608" width="1600" height="7" fill="url(#horizon)" opacity=".42"/>

<g class="mid">
<rect x="0" y="690" width="140" height="210"/>
<rect x="156" y="650" width="96" height="250"/>
<rect x="268" y="712" width="126" height="188"/>
<rect x="410" y="662" width="88" height="238"/>
<rect x="514" y="704" width="146" height="196"/>
<rect x="676" y="640" width="94" height="260"/>
<rect x="786" y="716" width="132" height="184"/>
<rect x="934" y="668" width="90" height="232"/>
<rect x="1040" y="708" width="140" height="192"/>
<rect x="1196" y="648" width="98" height="252"/>
<rect x="1310" y="718" width="128" height="182"/>
<rect x="1454" y="676" width="146" height="224"/>
</g>

<g>
<rect class="win-a fl-a" x="176" y="668" width="7" height="11" opacity=".85"/>
<rect class="win-b" x="196" y="668" width="7" height="11" opacity=".55"/>
<rect class="win-a" x="216" y="668" width="7" height="11" opacity=".7"/>
<rect class="win-b fl-b" x="176" y="694" width="7" height="11" opacity=".18"/>
<rect class="win-a" x="216" y="694" width="7" height="11" opacity=".6"/>
<rect class="win-a" x="196" y="720" width="7" height="11" opacity=".75"/>
<rect class="win-b fl-c" x="216" y="720" width="7" height="11" opacity=".75"/>

<rect class="win-a" x="428" y="680" width="7" height="11" opacity=".8"/>
<rect class="win-b fl-b" x="448" y="680" width="7" height="11" opacity=".18"/>
<rect class="win-a" x="468" y="680" width="7" height="11" opacity=".55"/>
<rect class="win-a fl-a" x="428" y="706" width="7" height="11" opacity=".85"/>
<rect class="win-b" x="468" y="706" width="7" height="11" opacity=".6"/>
<rect class="win-a" x="448" y="732" width="7" height="11" opacity=".7"/>

<rect class="win-b" x="694" y="658" width="7" height="11" opacity=".62"/>
<rect class="win-a" x="714" y="658" width="7" height="11" opacity=".8"/>
<rect class="win-a fl-c" x="734" y="658" width="7" height="11" opacity=".75"/>
<rect class="win-a" x="694" y="684" width="7" height="11" opacity=".5"/>
<rect class="win-b fl-b" x="714" y="684" width="7" height="11" opacity=".18"/>
<rect class="win-a" x="734" y="710" width="7" height="11" opacity=".72"/>
<rect class="win-a" x="694" y="736" width="7" height="11" opacity=".58"/>

<rect class="win-a" x="952" y="686" width="7" height="11" opacity=".78"/>
<rect class="win-b" x="972" y="686" width="7" height="11" opacity=".6"/>
<rect class="win-a fl-a" x="992" y="686" width="7" height="11" opacity=".85"/>
<rect class="win-a" x="952" y="712" width="7" height="11" opacity=".52"/>
<rect class="win-b fl-c" x="992" y="712" width="7" height="11" opacity=".75"/>

<rect class="win-a" x="1214" y="666" width="7" height="11" opacity=".8"/>
<rect class="win-b fl-b" x="1234" y="666" width="7" height="11" opacity=".18"/>
<rect class="win-a" x="1254" y="666" width="7" height="11" opacity=".6"/>
<rect class="win-a fl-a" x="1214" y="692" width="7" height="11" opacity=".85"/>
<rect class="win-a" x="1254" y="692" width="7" height="11" opacity=".55"/>
<rect class="win-b" x="1234" y="718" width="7" height="11" opacity=".65"/>

<rect class="win-b" x="1472" y="694" width="7" height="11" opacity=".6"/>
<rect class="win-a" x="1492" y="694" width="7" height="11" opacity=".78"/>
<rect class="win-a fl-c" x="1512" y="694" width="7" height="11" opacity=".75"/>
<rect class="win-a" x="1472" y="720" width="7" height="11" opacity=".5"/>
<rect class="win-b fl-b" x="1512" y="720" width="7" height="11" opacity=".18"/>
</g>

<g>
<rect class="neon-a pulse-a" x="170" y="674" width="6" height="74" rx="3" opacity=".85"/>
<rect class="neon-b pulse-b" x="406" y="690" width="6" height="58" rx="3" opacity=".5"/>
<rect class="neon-c pulse-c" x="772" y="666" width="6" height="88" rx="3" opacity=".7"/>
<rect class="neon-b pulse-a" x="1028" y="696" width="6" height="64" rx="3" opacity=".85"/>
<rect class="neon-a pulse-b" x="1300" y="676" width="6" height="78" rx="3" opacity=".5"/>
<rect class="neon-b pulse-c" x="1442" y="706" width="6" height="56" rx="3" opacity=".7"/>
<rect class="neon-a pulse-b" x="272" y="726" width="84" height="5" rx="2.5" opacity=".5"/>
<rect class="neon-c pulse-a" x="1052" y="724" width="96" height="5" rx="2.5" opacity=".85"/>
<rect class="neon-b pulse-c" x="540" y="720" width="74" height="5" rx="2.5" opacity=".7"/>
</g>

<g>
<rect class="mid" x="200" y="616" width="4" height="36"/>
<circle class="beacon" cx="202" cy="612" r="5" opacity=".15"/>
<rect class="mid" x="718" y="606" width="4" height="36"/>
<circle class="beacon" cx="720" cy="602" r="5" opacity=".15"/>
<rect class="mid" x="1242" y="614" width="4" height="36"/>
<circle class="beacon" cx="1244" cy="610" r="5" opacity=".15"/>
</g>

<g class="near">
<rect x="0" y="788" width="190" height="112"/>
<rect x="206" y="766" width="150" height="134"/>
<rect x="372" y="802" width="214" height="98"/>
<rect x="602" y="774" width="160" height="126"/>
<rect x="778" y="810" width="196" height="90"/>
<rect x="990" y="780" width="168" height="120"/>
<rect x="1174" y="806" width="222" height="94"/>
<rect x="1412" y="784" width="188" height="116"/>
</g>

<g class="rail">
<rect x="150" y="760" width="110" height="4" rx="2"/>
</g>
</svg>
`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Neither a reload of this mod nor --resume keeps the look, so set it here.
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    await $.command.register({ name: 'tokyonight', description: 'Turn the Tokyo Night look back on' })
    await $.command.register({ name: 'plain', description: 'Take the Tokyo Night look off' })

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    // This hook hears every mod's backdrop, so leave anyone else's alone.
    if (e.props.plugin !== $.plugin.name || e.props.scene !== SCENE) {
      return next(e)
    }

    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={ART}
        alt="A city skyline at night: stars drifting over dark towers, lit windows and neon strips along their walls, a pale moon to the right"
        isInteractive
      />
    )
  })

  on('command.run', { command: 'plain' }, async $ => {
    const cleared = await $.theme.clear()

    return { text: cleared.isDrawn ? 'The look is off.' : cleared.reason }
  })

  on('command.run', { command: 'tokyonight' }, async $ => {
    const set = await $.theme.set(LOOK)

    return { text: set.isDrawn ? 'Tokyo Night is on.' : set.reason }
  })
}
