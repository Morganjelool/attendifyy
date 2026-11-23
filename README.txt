ATTENDIFY - ABSENSI ONLINE (Supabase)

SETUP (sekali saja)
1. Daftar gratis di supabase.com > New project.
2. Buka SQL Editor > New query > tempel isi setup.sql > Run.
3. Buka Project Settings > API. Salin "Project URL" dan "anon public key" ke config.js.
4. Ganti sandi admin: jalankan  update admin_config set pass='SandiBaruKamu';  di SQL Editor.
5. Upload semua file ke hosting statis (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

CARA KERJA
- Siswa memencet "Saya hadir" -> tersimpan di database (jam diambil dari server, zona WIB).
- Admin masuk -> dashboard memuat data semua siswa dan diperbarui otomatis tiap 5 detik.
- Satu siswa hanya bisa absen sekali per hari (dijaga oleh database).
- Jika config.js dikosongkan, aplikasi kembali ke mode lokal (localStorage) seperti sebelumnya.

KEAMANAN
- Tabel dikunci (RLS). Siswa hanya bisa mengirim absen dan melihat riwayat sendiri lewat fungsi.
- Semua aksi admin wajib kata sandi yang dicek di database, bukan di browser.
- Gunakan hanya anon key di config.js, jangan pernah service_role key.
- Data lama di localStorage tidak otomatis diunggah ke database.
