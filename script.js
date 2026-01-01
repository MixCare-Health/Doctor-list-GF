// Data will be loaded from data/doctors.json via fetch.
let rawData = null;
// Group raw entries by doc_id+lang so each language-specific row becomes its own display item.
// This avoids hiding language variants when multiple rows share the same doc_id.
function mergeByDocId(data) {
	// Merge rows by doc_id into one doctor object that holds per-language maps.
	const map = new Map();
	data.forEach(item => {
		const id = item.doc_id || '';
		const lang = item.lang || 'en';
		if (!map.has(id)) {
			map.set(id, {
				id,
				names: {},
				addresses: {},
				address: item.doc_address || "",
				phones: {},
				specialties: {},
				openings: {},
				remarks: {},
				areas: {},
				districts: {},
				cities: {},
				lat: item.doc_lat || "",
				lng: item.doc_long || "",
				cta_link: item.cta_link || ""
			});
		}
		const doc = map.get(id);
		// populate per-language maps
		doc.names[lang] = item.doc_name || doc.names[lang] || '';
		if (item.doc_address) doc.addresses[lang] = item.doc_address;
		if (item.doc_tel_A) doc.phones[lang] = item.doc_tel_A;
		if (item.doc_cat_name) doc.specialties[lang] = item.doc_cat_name;
		if (item.doc_wh) doc.openings[lang] = item.doc_wh;
		if (item.doc_remark) doc.remarks[lang] = item.doc_remark;
		if (item.area_name) doc.areas[lang] = item.area_name;
		if (item.district_name) doc.districts[lang] = item.district_name;
		if (item.city_name) doc.cities[lang] = item.city_name;
		// keep lat/lng if not present yet
		if (!doc.lat && item.doc_lat) doc.lat = item.doc_lat;
		if (!doc.lng && item.doc_long) doc.lng = item.doc_long;
	});
	return Array.from(map.values());
}

// normalize per row: each JSON row becomes its own display item
function normalizePerRow(data) {
	return data.map((item, idx) => {
		const lang = item.lang || 'en';
		return {
			id: `${item.doc_id || ''}_${lang}_${idx}`,
			baseId: item.doc_id || '',
			names: { [lang]: item.doc_name || '' },
			addresses: { [lang]: item.doc_address || '' },
			address: item.doc_address || '',
			phones: { [lang]: item.doc_tel_A || '' },
			specialties: { [lang]: item.doc_cat_name || '' },
			openings: { [lang]: item.doc_wh || '' },
			remarks: { [lang]: item.doc_remark || '' },
			areas: { [lang]: item.area_name || '' },
			districts: { [lang]: item.district_name || '' },
			cities: { [lang]: item.city_name || '' },
			lat: item.doc_lat || '',
			lng: item.doc_long || '',
			cta_link: item.cta_link || ''
		};
	});
}

let doctors = [];
let showAllRecords = true;

async function loadDoctors() {
	// show loading
	if (resultCountEl) resultCountEl.textContent = 'Loading...';
	try {
		// fetch from absolute path so URL path segments (like /zh-hk) don't break the request
		const dataUrl = new URL('/data/doctors.json', location.origin).toString();
		const res = await fetch(dataUrl, { cache: 'no-store' });
		if (!res.ok) throw new Error('Failed to load doctors.json: ' + res.status);
		rawData = await res.json();
		// use showAllRecords flag to decide merge strategy
		doctors = showAllRecords ? normalizePerRow(rawData) : mergeByDocId(rawData);

		// detect language from URL (path first segment) or query param e.g. ?lang=zh-hk
		let initialLang = 'en';
		try{
			const params = new URLSearchParams(location.search);
			const q = params.get('lang');
			const pathSeg = (location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
			const cand = (q || pathSeg || '').toLowerCase();
			if (cand) {
				if (['zh-hk','zh_hk','zhhk','zh-hant','zh'].includes(cand)) initialLang = 'zh-HK';
				else if (['en','en-us','en-gb'].includes(cand)) initialLang = 'en';
			}
		} catch(e){ /* ignore */ }
		if (langSelect) langSelect.value = initialLang;
		// initialize filters and UI after data loaded
		populateFilters();
		applyTranslationsToUI();
		// set default city selection to Hong Kong if available
		setDefaultCitySelection();
		updateDistrictsForCity(citySelect.value || '');
		updateAreasForDistrict(citySelect.value || '', areaSelect.value || '');
		applyFilters();
	} catch (err) {
		console.error(err);
		resultsEl.innerHTML = `<div class="col-12"><div class="card"><div class="card-body text-danger">Error loading data</div></div></div>`;
		if (resultCountEl) resultCountEl.textContent = '0 doctors';
	}
}

// UI elements
const searchInput = document.getElementById('searchInput');
const specialtySelect = document.getElementById('specialtySelect');
const citySelect = document.getElementById('citySelect');
const districtSelect = document.getElementById('districtSelect');
const areaSelect = document.getElementById('areaSelect');
const resultsEl = document.getElementById('results');
const resultCountEl = document.getElementById('resultCount');
const clearBtn = document.getElementById('clearFilters');
const langSelect = document.getElementById('langSelect');

// simple translations for UI strings
const translations = {
	en: {
        brand: 'MixCare <strong>Doctor List</strong>',
		searchPlaceholder: 'Search doctor name (EN / 中文)',
		allSpecialties: 'All Specialties',
		allCities: 'All Cities',
		allDistricts: 'All Districts',
		allAreas: 'All Areas',
		clearFilters: 'Clear filters',
		callToBook: 'Call to book',
		map: 'Map',
		noDoctors: 'No doctors found.',
		phoneLabel: 'Phone',
		addressLabel: 'Address',
		openingLabel: 'Opening',
		remarkLabel: 'Remark',
		doctorsCount: (n) => `${n} doctor${n>1? 's':' found'}`,
		showAllRecords: 'Show all records'
	},
	'zh-HK': {
        brand: 'MixCare 網絡醫生名單',
		searchPlaceholder: '搜尋醫生姓名（英文/中文）',
		allSpecialties: '所有專科',
		allCities: '所有城市',
		allDistricts: '所有地區',
		allAreas: '所有分區',
		clearFilters: '清除篩選',
		callToBook: '致電預約',
		map: '地圖',
		noDoctors: '找不到醫生。',
		phoneLabel: '電話',
		addressLabel: '地址',
		openingLabel: '診症時間',
		remarkLabel: '自付費及藥物:',
		doctorsCount: (n) => `共找到 ${n} 位醫生`,
		showAllRecords: '顯示所有紀錄'
	}
};

function t(key, ...args){
	const lang = langSelect.value || 'en';
	const dict = translations[lang] || translations.en;
	const v = dict[key];
	if(typeof v === 'function') return v(...args);
	return v;
}

// helper to get localized data field from a doctor object
function tData(doc, field, lang){
	lang = lang || (langSelect && langSelect.value) || 'en';
	// map of field -> plural key in doctor object
	const plural = {
		name: 'names',
		address: 'addresses',
		specialty: 'specialties',
		opening: 'openings',
		area: 'areas',
		district: 'districts',
		city: 'cities',
		phone: 'phones',
		remark: 'remarks'
	};
	const key = plural[field] || (field + 's');
	const map = doc[key] || {};
	if (map && typeof map === 'object' && !Array.isArray(map)){
		return map[lang] || map['zh-HK'] || map['zh-CN'] || map['en'] || '';
	}
	return map || '';
}

function applyTranslationsToUI(){
	searchInput.placeholder = t('searchPlaceholder');
	const brandEl = document.getElementById('brandTitle');
	if (brandEl) brandEl.innerHTML = t('brand');
	// update static option labels
	specialtySelect.querySelector('option') && (specialtySelect.querySelector('option').textContent = t('allSpecialties'));
	citySelect.querySelector('option') && (citySelect.querySelector('option').textContent = t('allCities'));
	districtSelect.querySelector('option') && (districtSelect.querySelector('option').textContent = t('allDistricts'));
	areaSelect.querySelector('option') && (areaSelect.querySelector('option').textContent = t('allAreas'));
	clearBtn.textContent = t('clearFilters');
}

// update the URL query param 'lang' without reloading the page
function updateUrlLang(lang){
	if (!lang) return;
	const normalized = (lang || '').toString().toLowerCase().replace('_','-');
	const url = new URL(location.href);
	url.searchParams.set('lang', normalized);
	// keep pathname as-is
	history.replaceState(null, '', url.toString());
}

// Populate specialty and area/district/sub lists
function populateFilters() {
	const specialties = new Set();
	const cities = new Map(); // cityLabel -> set(districtLabel) -> set(areaLabel)

	// build localized sets based on current language
	const lang = (langSelect && langSelect.value) || 'en';
	doctors.forEach(d => {
		const spec = tData(d, 'specialty', lang) || d.specialty || '';
		if (spec) specialties.add(spec);

		const cityLabel = tData(d, 'city', lang) || d.city || '';
		const districtLabel = tData(d, 'district', lang) || d.district || '';
		const areaLabel = tData(d, 'area', lang) || d.area || '';

		if (!cities.has(cityLabel)) cities.set(cityLabel, new Map());
		const districtMap = cities.get(cityLabel);
		if (!districtMap.has(districtLabel)) districtMap.set(districtLabel, new Set());
		if (areaLabel) districtMap.get(districtLabel).add(areaLabel);
	});

	// specialties (localized)
	[...specialties].sort().forEach(s => {
		const opt = document.createElement('option'); opt.value = s; opt.textContent = s; specialtySelect.appendChild(opt);
	});

	// cities (localized)
	[...cities.keys()].sort().forEach(c => {
		const opt = document.createElement('option'); opt.value = c; opt.textContent = c || '—'; citySelect.appendChild(opt);
	});

	window.__citiesMap = cities;
}

// Try to select a default city (prefer "Hong Kong" / "香港") when options exist
function setDefaultCitySelection(){
	if (!citySelect) return;
	const lang = (langSelect && langSelect.value) || 'en';
	// preferred labels in order
	const preferred = lang === 'en' ? ['Hong Kong','香港'] : ['香港','Hong Kong'];
	const options = Array.from(citySelect.options);
	for (const p of preferred){
		const matchOpt = options.find(opt => {
			const v = (opt.value || '').toString();
			const txt = (opt.textContent || '').toString();
			return v === p || txt === p || v.toLowerCase() === p.toLowerCase() || txt.toLowerCase() === p.toLowerCase();
		});
		if (matchOpt){
			citySelect.value = matchOpt.value;
			// populate dependent selects
			updateDistrictsForCity(matchOpt.value);
			updateAreasForDistrict(matchOpt.value, '');
			return;
		}
	}
	// if not found, leave blank
	citySelect.value = '';
}

function updateDistrictsForCity(city) {
	districtSelect.innerHTML = `<option value="">${t('allDistricts')}</option>`;
	areaSelect.innerHTML = `<option value="">${t('allAreas')}</option>`;
	const districts = new Set();
	const lang = (langSelect && langSelect.value) || 'en';

	// If we have a cities map built with localized labels, use it
	if (window.__citiesMap && (city in Object.fromEntries(window.__citiesMap))) {
		const districtMap = window.__citiesMap.get(city) || new Map();
		[...districtMap.keys()].sort().forEach(x => {
			const opt = document.createElement('option'); opt.value = x; opt.textContent = x; districtSelect.appendChild(opt);
		});
		return;
	}

	// fallback: build from doctors using localized labels
	doctors.forEach(d => {
		const c = tData(d, 'city', lang) || d.city || '';
		const districtLabel = tData(d, 'district', lang) || d.district || '';
		if (city === '' || c === city) {
			if (districtLabel) districts.add(districtLabel);
		}
	});
	[...districts].sort().forEach(x => {
		const opt = document.createElement('option'); opt.value = x; opt.textContent = x; districtSelect.appendChild(opt);
	});
}

function updateAreasForDistrict(city, district) {
	areaSelect.innerHTML = `<option value="">${t('allAreas')}</option>`;
	const areas = new Set();
	const lang = (langSelect && langSelect.value) || 'en';

	// try using cities map first
	if (window.__citiesMap && (city in Object.fromEntries(window.__citiesMap))) {
		const districtMap = window.__citiesMap.get(city) || new Map();
		const areaSet = districtMap.get(district) || new Set();
		[...areaSet].sort().forEach(x => {
			const opt = document.createElement('option'); opt.value = x; opt.textContent = x; areaSelect.appendChild(opt);
		});
		return;
	}

	doctors.forEach(d => {
		const c = tData(d, 'city', lang) || d.city || '';
		const districtLabel = tData(d, 'district', lang) || d.district || '';
		const areaLabel = tData(d, 'area', lang) || d.area || '';
		if ((city === '' || c === city) && (district === '' || districtLabel === district)) {
			if (areaLabel) areas.add(areaLabel);
		}
	});
	[...areas].sort().forEach(x => {
		const opt = document.createElement('option'); opt.value = x; opt.textContent = x; areaSelect.appendChild(opt);
	});
}

function formatPhoneForTel(phone){
	if(!phone) return '';
	return phone.replace(/[^+0-9]/g,'');
}

function renderDoctors(list) {
	resultsEl.innerHTML = '';
	if (!list.length) {
		const noEl = document.createElement('div'); noEl.className = 'col-12'; noEl.innerHTML = `<div class="card"><div class="card-body meta">${t('noDoctors')}</div></div>`;
		resultsEl.appendChild(noEl);
		resultCountEl.textContent = t('doctorsCount', 0);
		return;
	}
	resultCountEl.textContent = t('doctorsCount', list.length);

	// Render one card per doctor. Each card gets a small per-card language selector when multiple languages exist.
	list.forEach(d => {
		const availableLangs = Object.keys(d.names || {});
		// pick initial language: prefer global UI lang if present
		const globalLang = (langSelect && langSelect.value) || 'en';
		let cardLang = availableLangs.includes(globalLang) ? globalLang : (availableLangs[0] || globalLang);
		const col = document.createElement('div'); col.className = 'col-md-12';
		const card = document.createElement('div'); card.className = 'card h-100';
		const body = document.createElement('div'); body.className = 'card-body d-flex flex-column';

		// header row: name + per-card language select
		const headerRow = document.createElement('div'); headerRow.className = 'd-flex align-items-start justify-content-between mb-2';
		const h = document.createElement('h5'); h.className = 'card-title mb-0'; headerRow.appendChild(h);

		if (availableLangs.length > 1) {
			const langSel = document.createElement('select');
			langSel.className = 'form-select form-select-sm ms-2';
			langSel.style.width = 'auto';
			availableLangs.forEach(lc => {
				const opt = document.createElement('option'); opt.value = lc; opt.textContent = langLabel(lc); langSel.appendChild(opt);
			});
			langSel.value = cardLang;
			headerRow.appendChild(langSel);
			// when user changes per-card language, update fields inside this card
			langSel.addEventListener('change', (e) => {
				cardLang = e.target.value;
				renderCardFields();
			});
		}
		body.appendChild(headerRow);

		const meta = document.createElement('div'); meta.className = 'meta mb-2'; body.appendChild(meta);
		const loc = document.createElement('div'); loc.className = 'text-muted mb-2'; body.appendChild(loc);
		const addressLine = document.createElement('div'); addressLine.className = 'mb-2 text-break'; body.appendChild(addressLine);
		const phoneLine = document.createElement('div'); body.appendChild(phoneLine);
		const openLine = document.createElement('div'); openLine.className = 'mb-3'; body.appendChild(openLine);
		const remarkLine = document.createElement('div'); remarkLine.className = 'mb-3'; body.appendChild(remarkLine);
		const actions = document.createElement('div'); actions.className = 'mt-auto d-flex gap-2 justify-content-end'; body.appendChild(actions);

		card.appendChild(body);
		col.appendChild(card);
		resultsEl.appendChild(col);

		// function that renders text & actions for the chosen language for this card
		function renderCardFields(){
			const name = tData(d, 'name', cardLang) || tData(d, 'name', 'en') || Object.values(d.names || {})[0] || 'Unknown';
			const spec = tData(d, 'specialty', cardLang) || '—';
			const cityLabel = tData(d, 'city', cardLang) || '';
			const districtLabel = tData(d, 'district', cardLang) || '';
			const areaLabel = tData(d, 'area', cardLang) || '';
			const addressText = tData(d, 'address', cardLang) || d.address || '';
			const phoneLabel = tData(d, 'phone', cardLang) || Object.values(d.phones || {})[0] || '';
			const openingLabel = tData(d, 'opening', cardLang) || Object.values(d.openings || {})[0] || '';
			const remarkText = tData(d, 'remark', cardLang) || Object.values(d.remarks || {})[0] || '';

			// update DOM
			h.textContent = name;
			meta.textContent = spec;
			loc.textContent = `${cityLabel || ''} • ${districtLabel || ''} • ${areaLabel || ''}`;
			if (addressText) addressLine.innerHTML = `<strong>${t('addressLabel')}: </strong><small class="text-muted">${addressText}</small>`;
			else addressLine.innerHTML = `<strong>${t('addressLabel')}: </strong><small class="text-muted">—</small>`;
			phoneLine.innerHTML = `<strong>${t('phoneLabel')}: </strong> ${phoneLabel ? `<a href="tel:${formatPhoneForTel(phoneLabel)}">${phoneLabel}</a>` : '—'}`;
			openLine.innerHTML = `<strong>${t('openingLabel')}: </strong> ${openingLabel || '—'}`;
			remarkLine.innerHTML = `<strong>${t('remarkLabel')}: </strong> ${remarkText || '—'}`;

			// rebuild actions
			actions.innerHTML = '';
			if (phoneLabel) {
				const callBtn = document.createElement('a'); callBtn.className = 'btn btn-primary btn-sm'; callBtn.href = `tel:${formatPhoneForTel(phoneLabel)}`; callBtn.textContent = t('callToBook'); actions.appendChild(callBtn);
			} else {
				const callBtn = document.createElement('button'); callBtn.className = 'btn btn-secondary btn-sm disabled'; callBtn.type = 'button'; callBtn.textContent = t('callToBook'); callBtn.setAttribute('aria-disabled','true'); actions.appendChild(callBtn);
			}

			// map button prefers localized address if available
			let addressQuery = addressText || '';
			if (!addressQuery) {
				addressQuery = [d.address, areaLabel, districtLabel, cityLabel].filter(Boolean).join(' ').trim();
			}
			if (addressQuery) {
				const mapBtn = document.createElement('a'); mapBtn.className = 'btn btn-outline-secondary btn-sm map-link'; mapBtn.target = '_blank'; mapBtn.rel='noopener'; mapBtn.href = `https://www.google.com/maps?&q=${encodeURIComponent(addressQuery)}&z=19`; mapBtn.textContent = t('map'); actions.appendChild(mapBtn);
			} else if (d.lat && d.lng) {
				const mapBtn = document.createElement('a'); mapBtn.className = 'btn btn-outline-secondary btn-sm map-link'; mapBtn.target = '_blank'; mapBtn.rel='noopener'; mapBtn.href = `https://www.google.com/maps/@${encodeURIComponent(d.lat)},${encodeURIComponent(d.lng)},19z`; mapBtn.textContent = t('map'); actions.appendChild(mapBtn);
			}
		}

		// initial render
		renderCardFields();

		// helper to display nice labels for language codes
		function langLabel(code){
			switch((code||'').toLowerCase()){
				case 'en': return 'EN';
				case 'zh-hk': return '中文 (繁)';
				case 'zh-cn': return '中文 (简)';
				case 'zh-hant': return '中文 (繁)';
				case 'zh': return '中文';
				default: return code;
			}
		}

	});
}

function applyFilters() {
	const q = (searchInput.value || '').trim().toLowerCase();
	const specialty = specialtySelect.value;
	const city = citySelect.value;
	const district = districtSelect.value;
	const area = areaSelect.value;

	// Improved filtering: compare selected filter values against any available localized value for the doctor
	const filtered = doctors.filter(d => {
		// name search across all languages
		const allNames = Object.values(d.names || {}).join(' ').toLowerCase();
		if (q && !allNames.includes(q)) return false;

		// Specialty: match against any language variant stored in d.specialties
		if (specialty) {
			const specs = Object.values(d.specialties || {}).map(s => (s||'').toString().toLowerCase());
			if (!specs.some(s => s === specialty.toLowerCase())) return false;
		}

		// City / District / Area: match against any localized variant
		if (city) {
			const cities = Object.values(d.cities || {}).map(x => (x||'').toString().toLowerCase());
			if (!cities.some(c => c === city.toLowerCase())) return false;
		}
		if (district) {
			const districts = Object.values(d.districts || {}).map(x => (x||'').toString().toLowerCase());
			if (!districts.some(c => c === district.toLowerCase())) return false;
		}
		if (area) {
			const areas = Object.values(d.areas || {}).map(x => (x||'').toString().toLowerCase());
			if (!areas.some(c => c === area.toLowerCase())) return false;
		}

		return true;
	});

	renderDoctors(filtered);
}

// Event listeners
searchInput.addEventListener('input', () => applyFilters());
specialtySelect.addEventListener('change', () => applyFilters());
citySelect.addEventListener('change', (e) => { updateDistrictsForCity(e.target.value); updateAreasForDistrict(e.target.value, ''); applyFilters(); });
districtSelect.addEventListener('change', (e) => { updateAreasForDistrict(citySelect.value, e.target.value); applyFilters(); });
areaSelect.addEventListener('change', () => applyFilters());
clearBtn.addEventListener('click', () => {
	searchInput.value=''; specialtySelect.value=''; citySelect.value=''; districtSelect.value=''; areaSelect.value='';
	updateDistrictsForCity(''); updateAreasForDistrict('',''); applyFilters();
});
langSelect.addEventListener('change', () => {
	// when language changes, repopulate localized filter labels and reset selections
	applyTranslationsToUI();
	// clear current options then repopulate
	specialtySelect.innerHTML = '<option value="">' + t('allSpecialties') + '</option>';
	citySelect.innerHTML = '<option value="">' + t('allCities') + '</option>';
	districtSelect.innerHTML = '<option value="">' + t('allDistricts') + '</option>';
	areaSelect.innerHTML = '<option value="">' + t('allAreas') + '</option>';
	populateFilters();
	updateDistrictsForCity('');
	updateAreasForDistrict('','');
	applyFilters();
	// reflect language choice in the URL query param
	updateUrlLang(langSelect.value);
});

// Initialize - load data from JSON then initialize UI
loadDoctors();

