export type NepalProvince = {
  provinceNo: number;
  provinceName: string;
  districts: string[];
};

export const NEPAL_PROVINCES: NepalProvince[] = [
  {
    provinceNo: 1,
    provinceName: 'Koshi Province',
    districts: [
      'Bhojpur',
      'Dhankuta',
      'Ilam',
      'Jhapa',
      'Khotang',
      'Morang',
      'Okhaldhunga',
      'Panchthar',
      'Sankhuwasabha',
      'Solukhumbu',
      'Sunsari',
      'Taplejung',
      'Terhathum',
      'Udayapur'
    ]
  },
  {
    provinceNo: 2,
    provinceName: 'Madhesh Province',
    districts: ['Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha']
  },
  {
    provinceNo: 3,
    provinceName: 'Bagmati Province',
    districts: [
      'Bhaktapur',
      'Chitwan',
      'Dhading',
      'Dolakha',
      'Kathmandu',
      'Kavrepalanchok',
      'Lalitpur',
      'Makwanpur',
      'Nuwakot',
      'Ramechhap',
      'Rasuwa',
      'Sindhuli',
      'Sindhupalchok'
    ]
  },
  {
    provinceNo: 4,
    provinceName: 'Gandaki Province',
    districts: [
      'Baglung',
      'Gorkha',
      'Kaski',
      'Lamjung',
      'Manang',
      'Mustang',
      'Myagdi',
      'Nawalpur',
      'Parbat',
      'Syangja',
      'Tanahun'
    ]
  },
  {
    provinceNo: 5,
    provinceName: 'Lumbini Province',
    districts: [
      'Arghakhanchi',
      'Banke',
      'Bardiya',
      'Dang',
      'Gulmi',
      'Kapilvastu',
      'Nawalparasi West',
      'Palpa',
      'Pyuthan',
      'Rolpa',
      'Rukum East',
      'Rupandehi'
    ]
  },
  {
    provinceNo: 6,
    provinceName: 'Karnali Province',
    districts: [
      'Dailekh',
      'Dolpa',
      'Humla',
      'Jajarkot',
      'Jumla',
      'Kalikot',
      'Mugu',
      'Rukum West',
      'Salyan',
      'Surkhet'
    ]
  },
  {
    provinceNo: 7,
    provinceName: 'Sudurpashchim Province',
    districts: ['Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti', 'Kailali', 'Kanchanpur']
  }
];
