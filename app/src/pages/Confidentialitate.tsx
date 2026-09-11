import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHead } from '../components/PageHead';
import { useStore } from '../store/state';
import './Confidentialitate.css';

/* Nota de informare privind prelucrarea datelor cu caracter personal (GDPR), pentru datele
   elevilor introduse de licee la înscrieri. Textul e un punct de plecare standard; înainte de
   a fi considerat final, trebuie verificat de responsabilul cu protecția datelor al Primăriei. */
export default function Confidentialitate() {
  const c = useStore(s => s.state.config.contact);
  useEffect(() => { document.title = 'Confidențialitate · Olimpiada Liceelor Slatina 2026'; }, []);
  return (
    <div className="page cf">
      <PageHead idx="Protecția datelor · GDPR" title="Notă de informare" lead="Cum sunt prelucrate datele elevilor și profesorilor înscriși la Olimpiada Liceelor Slatina 2026, cine le vede, cât timp se păstrează și ce drepturi au persoanele vizate." />
      <article className="container cf-body">
        <section>
          <h2 className="h3">1. Cine prelucrează datele</h2>
          <p>Operatorul de date este <b>Primăria Municipiului Slatina</b>, {c.address}, în calitate de organizator al programului „Olimpiada Liceelor”, aprobat prin HCL nr. 184 / 18.06.2026. Contact: <a href={`mailto:${c.email}`}>{c.email}</a>{c.phone ? <>, {c.phone}</> : null}.</p>
        </section>
        <section>
          <h2 className="h3">2. Ce date colectăm</h2>
          <p>Pentru fiecare elev înscris într-un echipaj: nume și prenume, clasa, codul numeric personal, seria și numărul cărții de identitate, un număr de telefon de contact. Pentru profesorii coordonatori și antrenori: nume, prenume și telefon. Datele sunt introduse de unitatea de învățământ, prin contul ei, nu direct de elevi.</p>
          <p>Nu colectăm alte categorii de date. Nu cerem copii ale actelor de identitate prin site.</p>
        </section>
        <section>
          <h2 className="h3">3. De ce le colectăm și pe ce temei</h2>
          <ul>
            <li>validarea participării (elevul este înscris la liceul respectiv, în clasele a IX-a – a XI-a, la cel mult două probe, conform regulamentului);</li>
            <li>întocmirea fișelor de înscriere, a diplomelor și a documentelor de premiere prevăzute de HCL 184/2026;</li>
            <li>contactarea coordonatorilor pentru organizare.</li>
          </ul>
          <p>Temeiul prelucrării este îndeplinirea unei sarcini de interes public a autorității locale (art. 6 alin. 1 lit. e din Regulamentul UE 2016/679), în baza hotărârii Consiliului Local. Pentru elevii minori, unitatea de învățământ obține și păstrează acordul părinților sau al reprezentanților legali înainte de înscriere și confirmă acest lucru în platformă.</p>
        </section>
        <section>
          <h2 className="h3">4. Cine are acces</h2>
          <p>Datele unui liceu pot fi văzute doar de contul acelui liceu și de organizator (Primăria Slatina, prin panoul de administrare). Nu sunt publicate pe site și nu sunt transmise altor licee. Public pot apărea cel mult numele elevilor din loturi, numai dacă organizatorul activează această opțiune și fără nicio altă informație.</p>
          <p>Datele nu sunt folosite în scop comercial și nu sunt transmise unor terți, cu excepția obligațiilor legale (de exemplu, documentele financiare de premiere).</p>
        </section>
        <section>
          <h2 className="h3">5. Cum sunt protejate</h2>
          <p>Datele de înscriere sunt stocate criptate (AES-256) pe infrastructura Cloudflare, separat de conținutul public al site-ului, și sunt transmise doar prin conexiuni securizate (HTTPS). Accesul se face pe bază de utilizator și parolă; parolele nu sunt stocate în clar. Conturile liceelor sunt create de organizator.</p>
        </section>
        <section>
          <h2 className="h3">6. Cât timp se păstrează</h2>
          <p>Până la încheierea ediției 2026 și finalizarea premierii, apoi cel mult până la <b>31 decembrie 2026</b>, după care sunt șterse din platformă. Documentele întocmite pe baza lor (fișe de înscriere, state de premiere) se păstrează conform legislației privind arhivarea documentelor administrației publice.</p>
        </section>
        <section>
          <h2 className="h3">7. Drepturile persoanelor vizate</h2>
          <p>Elevii, părinții și profesorii au dreptul de acces la datele lor, de rectificare, de ștergere (în limitele obligațiilor legale ale organizatorului), de restricționare a prelucrării și de opoziție, precum și dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (<a href="https://www.dataprotection.ro" target="_blank" rel="noreferrer">dataprotection.ro</a>). Cererile se trimit la <a href={`mailto:${c.email}`}>{c.email}</a> sau la unitatea de învățământ care a făcut înscrierea.</p>
        </section>
        <section>
          <h2 className="h3">8. Site-ul public</h2>
          <p>Paginile publice ale site-ului nu cer date personale și nu folosesc cookie-uri de urmărire. Site-ul reține în browserul tău doar preferințe locale (de exemplu, poziția insignei „Cred în Slatina”), care nu părăsesc dispozitivul. Hărțile folosesc date OpenStreetMap.</p>
        </section>
        <p className="mono cf-foot">Versiunea 1 · septembrie 2026 · <Link to="/inscrieri">Înscrieri licee</Link></p>
      </article>
    </div>
  );
}
