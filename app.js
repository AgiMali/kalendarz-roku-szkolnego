import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const STORAGE_KEY = "school-year-planner-v1";
const firebaseConfig = {
  apiKey: "AIzaSyDAjJV4FhZOJ6G7XRgHVPNcgnncqNhbE1M",
  authDomain: "kalendarz-roku-szkolnego-afebe.firebaseapp.com",
  projectId: "kalendarz-roku-szkolnego-afebe",
  storageBucket: "kalendarz-roku-szkolnego-afebe.firebasestorage.app",
  messagingSenderId: "1072994268353",
  appId: "1:1072994268353:web:eb364cc3846bc39059d040",
};
const monthNames = [
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
];
const calendarMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const weekdayNames = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const trackedWeekdays = [
  { day: 1, short: "Pon.", label: "poniedziałków" },
  { day: 2, short: "Wt.", label: "wtorków" },
  { day: 3, short: "Śr.", label: "śród" },
  { day: 4, short: "Czw.", label: "czwartków" },
  { day: 5, short: "Pt.", label: "piątków" },
];
const DEFAULT_START_DATE = "2026-09-01";
const DEFAULT_END_DATE = "2027-06-25";
const DEFAULT_LESSON_SLOTS = 8;
const TOPIC_LISTS = [
  {
    id: "zr-2",
    subject: "ZR",
    groups: ["2a", "2b"],
    topics: [
      "W pracowni komputerowej – zapoznanie z regulaminem pracowni.",
      "Wchodzimy do komputerowego świata – logowanie, pulpit i ikony.",
      "W pracowni małego grafika – poznajemy program Paint.",
      "Myszka w akcji – tropem kropek.",
      "Przybornik i jego tajemnice.",
      "Zgadnij mój rysunek - AutoDraw",
      "Paleta kolorów – kolorujemy według wzoru (selektor kolorów).",
      "Tajemnice palety kolorów – kolory niestandardowe.",
      "Gdzie zapisał się mój rysunek? - foldery i pliki.",
      "Falująca flaga – tworzymy obrazek z linii i krzywej.",
      "Ćwiczymy sprawność i refleks – wyścigi samochodowe.",
      "Fabryka robotów – tworzymy postać z figur geometrycznych.",
      "Fabryka robotów – otwieramy i modyfikujemy zapisane prace.",
      "Świąteczne kodowanie – dyktando graficzne",
      "Projektujemy świąteczną bombkę w Paint.",
      "Choinka pełna ozdób – kopiujemy i powielamy elementy.",
      "Zaczarowany świat kolorów - poznajemy Tux Paint.",
      "Mroźne wzory – ozdabiamy zimowe okno.",
      "Mali konstruktorzy – budujemy własne modele.",
      "Bezpieczny Internet – DBI 2027",
      "DBI – plakat w Paint",
      "Interland – uczymy się bezpiecznie.",
      "Poznajemy Office.com – logujemy się do chmury.",
      "Pierwsze kroki w Word Online – piszemy i poprawiamy tekst.",
      "Zaproszenie na… - czcionka i jej tajemnice.",
      "Poznajemy ScratchJr – pierwsze kroki.",
      "Ożywiamy bohatera – programujemy ruch.",
      "Tworzymy animowaną historyjkę.",
      "Projektujemy okładkę ulubionej książki.",
      "Kolorowe piksele – tworzymy obrazek.",
      "Kolorowy zawrót głowy – obracanie i odbijanie.",
      "Malujemy piaskiem – tworzymy własne kompozycje.",
      "W krainie Tux Paint – tworzymy własny obraz.",
      "Przepis na lody – strona książki kucharskiej.",
      "Noc w wielkim mieście – kopiowanie i wklejanie elementów.",
      "Projektujemy wakacyjną pocztówkę.",
      "Bezpieczne wakacje – mądrze korzystamy z technologi.",
    ],
  },
  {
    id: "tech-5",
    subject: "TECH",
    groups: ["5a", "5b"],
    topics: [
      "Zapoznanie z wymaganiami edukacyjnymi z techniki i regulaminem pracowni technicznej",
      "Niezwykły wynalazek – papier",
      "Papier pod lupą – badamy próbki papieru",
      "Formaty papieru i odczytywanie wymiarów",
      "Właściwości papieru i jego zastosowanie",
      "Przyrządy i narzędzia do prac z papierem",
      "Majsterka - ożywiamy papier.",
      "Majsterka - ożywiamy papier.",
      "Majsterka - ożywiamy papier.",
      "Majsterka - gra pudełkowa – od pomysłu do rozgrywki.",
      "Majsterka - gra pudełkowa – od pomysłu do rozgrywki.",
      "Majsterka - gra pudełkowa – od pomysłu do rozgrywki.",
      "Majsterka - gra pudełkowa – od pomysłu do rozgrywki.",
      "Włókna i ich pochodzenie.",
      "Wyroby włókiennicze - tkanina.",
      "Sploty z papieru – model tkaniny.",
      "Sploty z papieru – model tkaniny.",
      "Wyroby włókiennicze - dzianina.",
      "Majsterka - Krasnal z włóczki/sznurka.",
      "Majsterka - Krasnal z włóczki/sznurka.",
      "Konserwacja wyrobów włókienniczych – metki i piktogramy",
      "Droga do Mistrza Ubrań – rozgrywki powtórzeniowe",
      "Maskotka z filcu – projekt i wykrój",
      "Maskotka z filcu – przygotowanie elementów i przyszywanie guzików",
      "Maskotka z filcu – szycie ręczne/maszynowe.",
      "Maskotka z filcu – wypychanie, wykończenie i prezentacja.",
      "Escape room: Bela materiału.",
      "W świecie metali – właściwości i zastosowanie",
      "Drut jako materiał konstrukcyjny",
      "Majsterka z drutu – ćwiczenia gięcia i skręcania",
      "Majsterka z drutu – ćwiczenia gięcia i skręcania",
      "Drzewko szczęścia z drutu – projekt i przygotowanie elementów",
      "Drzewko szczęścia z drutu – wykonanie pnia i gałęzi",
      "Drzewko szczęścia z drutu – mocowanie ozdób i formowanie korony",
      "Drzewko szczęścia z drutu – wykończenie i prezentacja pracy",
      "Escape room: Tajemnica metalowej skrzynki",
    ],
  },
  {
    id: "tech-6",
    subject: "TECH",
    groups: ["6a", "6b"],
    topics: [
      "Zapoznanie z wymaganiami edukacyjnymi z techniki i regulaminem pracowni technicznej",
      "Poznajemy szkło",
      "Szkło przyszłości – niezwykły wynalazek: pomysł",
      "Szkło przyszłości – niezwykły wynalazek: projekt",
      "Szkło przyszłości – niezwykły wynalazek: prezentacja",
      "Zdobienie szkła – naczynie użytkowe z opakowania szklanego",
      "Recykling i ochrona środowiska.",
      "Drugie życie pudełka – projektujemy mini stadion",
      "Drugie życie pudełka – przygotowanie konstrukcji i elementów gry",
      "Drugie życie pudełka – montaż zawodników i wykończenie gry",
      "Drugie życie pudełka – testowanie i klasowe rozgrywki",
      "Tworzywa sztuczne wokół nas – rozpoznawanie i właściwości",
      "Potwory i Spółka – projektujemy zestaw organizerów na przybory szkolne",
      "Potwory i Spółka – przygotowanie i ozdabianie pojemników",
      "Potwory i Spółka – montaż organizerów na deseczce i wykończenie pracy",
      "Warsztat kreślarski - przybory i rodzaje linii.",
      "Rysowanie figur płaskich - dokładność i wymiary.",
      "Pismo techniczne - czytelny opis projektu.",
      "Od siatki do bryły – magia geometrii",
      "Rzuty prostokątne – przedstawianie przedmiotów na rzutni.",
      "Wymiarowanie - jak poprawnie zapisać wymiary przedmiotu?",
      "Materiały kompozytowe – laboratorium właściwości materiałów",
      "Przewodniki, izolatory i elementy obwodu elektrycznego.",
      "Tinkercad Circuits - projektowanie i testowanie obwodów elektrycznych.",
      "Tinkercad Circuits - testowanie i modyfikowanie obwodów elektrycznych.",
      "Majsterka - Świecąca kartka LED - obwód elektryczny w praktyce.",
      "Materiały elektroniczne – projektujemy i wykonujemy grę „Nie dotknij drutu!”",
      "Materiały elektroniczne – projektujemy i wykonujemy grę „Nie dotknij drutu!”",
      "Materiały elektroniczne – projektujemy i wykonujemy grę „Nie dotknij drutu!”",
      "Mechatronika wokół nas – mechanizmy, napędy i sterowanie",
      "Maszyny proste w praktyce – odkrywamy mechanizmy codziennych przedmiotów",
      "Konstrukcja z napędem elektrycznym – projekt i planowanie konstrukcji",
      "Konstrukcja z napędem elektrycznym – wykonanie podwozia i układu jezdnego",
      "Konstrukcja z napędem elektrycznym – testowanie, udoskonalanie i wyścigi",
      "Konstrukcja z napędem elektrycznym – testowanie i udoskonalanie konstrukcji",
      "Inteligentny dom",
    ],
  },
  {
    id: "zpt-4",
    subject: "ZPT",
    groups: ["4a", "4b"],
    topics: [
      "Zapoznanie uczniów z wymaganiami edukacyjnymi z ZPT i rozkładem",
      "BHP w pracowni technicznej",
      "Znaki bezpieczeństwa",
      "Znaki bezpieczeństwa",
      "Bezpieczeństwo na co dzień",
      "Bezpieczeństwo na co dzień",
      "Niezwykły wynalazek – papier",
      "Właściwości papieru i jego zastosowanie",
      "Papier pod lupą – badamy próbki papieru",
      "Narzędzia pod kontrolą",
      "Recykling w praktyce – robocik z kartonu",
      "Recykling w praktyce – robocik z kartonu",
      "Recykling w praktyce – robocik z kartonu",
      "Recykling w praktyce – robocik z kartonu",
      "Recykling w praktyce – robocik z kartonu",
      "Recykling w praktyce – robocik z kartonu",
      "Doświadczenie edukacyjne - \"Drugie życie pudełka – od rozpoznania\"",
      "Doświadczenie edukacyjne - \"Drugie życie pudełka – od rozpoznania\"",
      "Doświadczenie edukacyjne - \"Drugie życie pudełka – od rozpoznania\"",
      "Doświadczenie edukacyjne - \"Drugie życie pudełka – od rozpoznania\"",
      "Doświadczenie edukacyjne - \"Drugie życie pudełka – od rozpoznania\"",
      "Doświadczenie edukacyjne - \"Drugie życie pudełka – od rozpoznania\"",
      "Formaty arkuszy papieru – poznajemy ich powstawanie i zastosowanie",
      "Formaty arkuszy papieru – poznajemy ich powstawanie i zastosowanie",
      "Powiększanie i pomniejszanie rysunków metodą siatki – praca zespołowa",
      "Powiększanie i pomniejszanie rysunków metodą siatki – praca zespołowa",
      "Papierowe ogniwa – projektowanie i wykonanie przestrzennych postaci",
      "Papierowe ogniwa – projektowanie i wykonanie przestrzennych postaci",
      "Papierowe ogniwa – projektowanie i wykonanie przestrzennych postaci",
      "„Świąteczna scena – kurtyna w górę!”",
      "Zapoznanie z portalem www.kartarowerowa.net",
      "Drogowe ABC",
      "Bezpieczny pieszy",
      "Vademecum rowerzysty",
      "Majsterka – rower z recyklingu",
      "Majsterka – rower z recyklingu",
      "Bezpieczny rowerzysta",
      "Bezpieczny rowerzysta",
      "Zanim wyruszysz – sygnały drogowe",
      "Znaki drogowe poziome",
      "Znaki drogowe pionowe",
      "Ogólne zasady ruchu rowerów",
      "Manewry na drodze",
      "Manewry na drodze",
      "Rowerem przez skrzyżowanie równorzędne",
      "Rowerem przez skrzyżowanie równorzędne",
      "Rowerem przez skrzyżowanie podporządkowane",
      "Rowerem przez skrzyżowanie podporządkowane",
      "Rowerem przez skrzyżowanie o ruchu okrężnym i ruchu kierowanym",
      "Rowerem przez skrzyżowanie o ruchu okrężnym i ruchu kierowanym",
      "Elektryczna mikromobilność",
      "Praktyczne sytuacje drogowe – rozpoznajemy zagrożenia",
      "Apteczka pierwszej pomocy i wzywanie służb ratunkowych",
      "Apteczka pierwszej pomocy i wzywanie służb ratunkowych",
      "Postępowanie z osobą poszkodowaną – ocena sytuacji, przytomności i oddychania",
      "Postępowanie z osobą poszkodowaną – ocena sytuacji, przytomności i oddychania",
      "Udzielanie pierwszej pomocy przy niegroźnych urazach",
      "Udzielanie pierwszej pomocy przy niegroźnych urazach",
      "Pierwsza pomoc w praktyce – pozycja boczna bezpieczna i scenki sytuacyjne",
      "Pierwsza pomoc w praktyce – pozycja boczna bezpieczna i scenki sytuacyjne",
      "Egzamin na kartę rowerową",
      "Egzamin na kartę rowerową",
      "Projekt „List do...” – od pomysłu do planu działania",
      "Drugie życie papieru – przygotowanie masy i wykonanie papieru czerpanego",
      "Drugie życie papieru – przygotowanie masy i wykonanie papieru czerpanego",
      "Od papieru do papeterii – projektowanie i wykonanie koperty",
      "Od papieru do papeterii – projektowanie i wykonanie koperty",
      "„List do...” – wykończenie papeterii, napisanie listu i prezentacja",
      "„List do...” – wykończenie papeterii, napisanie listu i prezentacja",
      "„List do...” – wykończenie papeterii, napisanie listu i prezentacja",
    ],
  },
  {
    id: "inf-4",
    subject: "INF",
    groups: ["4a", "4b"],
    topics: [
      "Zapoznanie z wymaganiami edukacyjnymi z Informatyki i regulaminem pracowni komputerowej.",
      "Praca z programem komputerowym i zasady zachowania w pracowni - organizujemy stanowisko i dbamy o zdrowie podczas pracy.",
      "Tworzymy rysunek w programie Paint i go zapisujemy - nadajemy plikowi nazwę i wybieramy miejsce zapisu.",
      "Wysyłamy e-maila z załącznikiem - stosujemy netykietę i chronimy dane osobowe.",
      "Korzystamy z edytora tekstu - tworzymy i zapisujemy krótki tekst według własnego pomysłu.",
      "Pracujemy z dwoma uruchomionymi programami - dobieramy narzędzia do zadania i przełączamy się między oknami.",
      "Korzystamy z Internetu w bezpieczny sposób - chronimy prywatność i wiemy, gdzie szukać pomocy.",
      "Sztuczna inteligencja (AI) - poznajemy jej zastosowania, ograniczenia i zasady bezpiecznego korzystania.",
      "Wyszukujemy i weryfikujemy informacje w Internecie - dobieramy słowa kluczowe, porównujemy źródła i oceniamy wiarygodność treści.",
      "Tworzymy foldery i porządkujemy pliki - organizujemy miejsce na własne prace graficzne.",
      "Uzupełniamy grafikę tekstem - tworzymy czytelny komunikat i zapisujemy zmiany w pliku.",
      "Przekształcamy fragmenty rysunku - zaznaczamy, przenosimy i kopiujemy elementy z wykorzystaniem Schowka.",
      "Stosujemy narzędzia Ołówek, Linia i Edytuj kolory - dobieramy narzędzia do własnego projektu.",
      "Tworzymy własną ilustrację w programie Paint - wykorzystujemy poznane narzędzia i doskonalimy pracę.",
      "„Na pomoc!” - określamy problem, budujemy i programujemy model LEGO SPIKE Prime.",
      "„Wyścig skoczków” - tworzymy prototyp, programujemy go i doskonalimy jego działanie.",
      "„Supersprzątacz” - budujemy i programujemy model oraz testujemy jego skuteczność.",
      "„Breakdance” - budujemy tancerza i programujemy ruchy z uwzględnieniem czasu, testujemy i poprawiamy program.",
      "Dzień Bezpiecznego Internetu - chronimy dane i wizerunek, rozpoznajemy zagrożenia i wiemy, gdzie szukać pomocy.",
      "Dzień Bezpiecznego Internetu - tworzymy plakaty z zasadami bezpiecznego i życzliwego zachowania w sieci.",
      "Programujemy w języku Scratch - układamy instrukcje krok po kroku i stosujemy powtarzanie poleceń.",
      "Tworzymy historyjkę w Scratchu - dodajemy duszki i planujemy działania postaci.",
      "Sterujemy duszkiem na ekranie - tworzymy prosty projekt, testujemy jego działanie i poprawiamy błędy.",
      "Tworzymy i formatujemy akapity w edytorze Word - ustawiamy wyrównanie i odstępy, dbając o czytelność dokumentu.",
      "Formatujemy tekst - dobieramy czcionkę i wyróżnienia ułatwiające czytanie.",
      "Redagujemy i poprawiamy tekst - kopiujemy i przenosimy fragmenty oraz stosujemy zasady poprawnego pisania.",
      "Stosujemy listy wypunktowane i numerowane - tworzymy uporządkowaną instrukcję lub zbiór zasad.",
      "Projektujemy plakat w Canvie - łączymy tekst z grafiką i podajemy źródła wykorzystanych materiałów.",
      "Korzystamy z szablonów Canvy - tworzymy zaproszenie i dostosowujemy przekaz do odbiorcy, chroniąc prywatne dane.",
      "Tworzymy grafikę na koszulkę z pomocą AI - doskonalimy polecenia, porównujemy wyniki i oceniamy ich przydatność.",
      "Realizujemy kampanię informacyjną - prezentujemy przygotowane materiały wybranym odbiorcom i oceniamy efekty doświadczenia edukacyjnego.",
      "Realizujemy kampanię informacyjną - prezentujemy przygotowane materiały wybranym odbiorcom i oceniamy efekty doświadczenia edukacyjnego.",
      "„Canva na cały rok” - planujemy projekt i przygotowujemy materiały graficzne.",
      "„Canva na cały rok” - planujemy projekt i przygotowujemy materiały graficzne.",
      "Asy internetu",
      "Asy internetu",
    ],
  },
  {
    id: "inf-5",
    subject: "INF",
    groups: ["5a", "5b"],
    topics: [
      "Zasady bezpiecznej pracy na lekcjach. Zapoznanie uczniów z wymaganiami edukacyjnymi z informatyki.",
      "Misja Cyberdetektywów – bezpieczni w sieci.",
      "Office – gdzie są moje pliki?",
      "Office – porządek w plikach i chmurze.",
      "Excel – odkrywamy tajemnice komórek.",
      "Excel – odkrywamy tajemnice komórek.",
      "Nadajemy tabeli styl – plan lekcji.",
      "Bilans – ile naprawdę wydajemy?",
      "Prezentujemy dane i wyniki w postaci wykresów.",
      "AI – gdzie spotykamy ją na co dzień?",
      "AI – uwierzysz jej na słowo? Sprawdzamy!",
      "Scratch – ożywiamy bohatera!",
      "Sztorm na morzu – dodajemy ruch, obraz i dźwięk.",
      "Pisakiem po tablicy – projekt domku.",
      "Pisakiem po tablicy – projekt domku.",
      "Pivot Animator – poznajemy postać i tworzymy pierwszą animację.",
      "Historia w ruchu – tworzymy i eksportujemy własną animację.",
      "DBI – kto zna moje dane?",
      "DBI – nie daj się złapać!",
      "Internet – znajdź, sprawdź, wykorzystaj.",
      "Robimy prezentację, której da się słuchać.",
      "Robimy prezentację, której da się słuchać.",
      "Szkolne wydarzenia – tworzymy i formatujemy tabelę.",
      "Szkolne wydarzenia – tworzymy i formatujemy tabelę.",
      "Redakcja szkolnej gazetki – piszemy artykuł.",
      "Tekst i obraz tworzą całość – opracowujemy gazetkę.",
      "Moja wymarzona podróż – projektujemy pocztówkę.",
      "Czy mogę użyć tego zdjęcia? – prawa autorskie i licencje.",
      "Niezwykły świat – tworzymy fotomontaż ze zdjęć.",
      "Dyplom dla wyjątkowej osoby – pracujemy z tekstem i grafiką.",
      "Nasza szkoła w pigułce – tworzymy broszurę informacyjną.",
      "Nasza szkoła w pigułce – tworzymy broszurę informacyjną.",
      "Nasza szkoła w pigułce – tworzymy broszurę informacyjną.",
      "Nasza szkoła w pigułce – tworzymy broszurę informacyjną.",
    ],
  },
  {
    id: "ek-1",
    subject: "EK",
    groups: ["1a", "1b", "1", "i"],
    topics: [
      "Poznajemy pracownię komputerową",
      "Poznajemy mysz komputerową",
      "Ćwiczymy posługiwanie się myszą",
      "Tworzymy instrukcje",
      "Poznajemy edytor grafiki Paint",
      "Pracujemy w edytorze grafiki Paint",
      "Rysujemy w programie Paint",
      "Komputer naszych marzeń",
      "Poznajemy klawiaturę – Backspace",
      "Powtarzamy wiadomości",
      "Kodujemy drogę",
      "Poznajemy język komputerów",
      "Kodujemy drogę",
      "Pracujemy według instrukcji",
      "Pracujemy według instrukcji",
      "Rysujemy choinkę – zapisujemy plik",
      "Poznajemy klawiaturę – Spacja i Shift",
      "Dodajemy tekst do obrazu",
      "Rysujemy w edytorze grafiki Paint",
      "Kodujemy i szukamy błędów w kodach",
      "Kodujemy",
      "Poznajemy sieć – internet",
      "Poznajemy klawiaturę – Alt",
      "Poznajemy klawiaturę – Enter",
      "Klikamy i gramy",
      "Rysujemy w edytorze grafiki Paint",
      "Dodajemy tekst do grafiki",
      "Utrwalenie – rysujemy w Paint",
      "Poznajemy roboty",
      "Poznajemy Scratcha",
      "Programujemy w Scratchu",
      "Rozwiązujemy łamigłówki",
      "Rozwiązujemy łamigłówki",
      "Poznajemy zasady bezpiecznego wypoczynku",
    ],
  },
  {
    id: "ek-3",
    subject: "ZR",
    subjects: ["ZR", "EK"],
    groups: ["3a", "3b", "3"],
    topics: [
      "W pracowni komputerowej – przypominamy zasady bezpieczeństwa.",
      "Tajemnice szyfrów – poznajemy szyfr „czekoladka”.",
      "Robot na planszy – kodujemy drogę do celu.",
      "Zakodowany obrazek – kolorujemy pola według instrukcji.",
      "Misja Robot – zaplanuj drogę do mety.",
      "Logujemy się do Office.com.",
      "Odnajdujemy swoje miejsce w cyfrowej pracowni.",
      "Wspomnienie z wakacji – praca w Paint.",
      "Czy komputer odgadnie mój rysunek? – AutoDraw.",
      "Bezpieczna droga do szkoły – korzystamy z Map Google.",
      "Balony na festyn – zmieniamy rozmiar i obracamy elementy.",
      "Jak znaleźć dobrą informację? – zwierzęcy detektywi w ZOO Wrocław.",
      "Słoik cukierków – duplikujemy elementy.",
      "Lista zakupów na zdrowe śniadanie.",
      "Projektujemy opakowanie tabliczki czekolady.",
      "Poprawiamy tekst – Delete i Backspace + proste kolorowanie.",
      "Pociąg pełen wagonów – kopiujemy elementy (CTRL+C, CTRL+V).",
      "Przepis na owocowy koktajl.",
      "Kolorowe komórki – poznajemy arkusz.",
      "Projektujemy medal.",
      "Zaproszenie na klasowe wydarzenie.",
      "Ile okien ma ten budynek?",
      "Poznajemy Scratch.",
      "Duszek wybiera się na spacer.",
      "Zmieniamy scenę i tło.",
      "Akwarium pełne rybek.",
      "Jesienne kodowanie – odczytujemy instrukcję obrazkową.",
      "Porządki w plecaku cyfrowym – pliki i foldery.",
      "Klawiaturowy labirynt – litery, cyfry i znaki.",
      "Zimowa pocztówka z figur geometrycznych.",
      "Co naprawdę widać na zdjęciu? – ostrożnie z AI.",
      "Cyfrowa kartka świąteczna – tekst i grafika.",
      "Prezent pod właściwy adres – ćwiczymy przeciąganie i kolejność.",
      "Mój plan dobrego dnia – tabela w Word Online.",
      "Internetowy tropiciel – wyszukujemy za pomocą trafnych słów.",
      "Zimowe piksele – obraz zapisany współrzędnymi.",
      "Maszyna do kanapek – tworzymy algorytm.",
      "Łowcy błędów – debugujemy instrukcję.",
      "DBI 2027: Mój sekret, moje hasło.",
      "DBI 2027: Gdy coś mnie niepokoi w sieci.",
      "Poczta bez pułapek – rozpoznajemy podejrzaną wiadomość.",
      "Karnawał masek – symetria w Paint.",
      "Prognoza pogody w ikonach – czytamy dane.",
      "Miniatlas chmur – informacja własnymi słowami.",
      "Wiosenny ogród – planujemy układ na siatce.",
      "Kopiuj, wytnij, wklej – porządkujemy rozsypankę tekstową.",
      "Moja wizytówka bez prywatnych danych.",
      "Ile tego jest? – proste sumowanie w arkuszu.",
      "Wielkanocny koszyk – projekt według warunków.",
      "Cyfrowe porządki – nadajemy plikom dobre nazwy.",
      "Światowy Dzień Książki – cyfrowa zakładka.",
      "Bohater książki odpowiada – bezpieczna rozmowa o AI.",
      "Okładka dla wymyślonej książki.",
      "Książkowy katalog – sortujemy i filtrujemy dane.",
      "Majowa wycieczka – wybieramy informacje z planu.",
      "Plan wycieczki – czytamy mapę i szacujemy trasę.",
      "Znaki drogowe z figur – grafika wektorowa w prostym edytorze.",
      "Instrukcja dla kosmity – precyzyjne polecenia.",
      "Kodujemy wzór – pętle bez komputera.",
      "Czy ta wiadomość jest dla wszystkich? – netykieta.",
      "Zdjęcie też ma autora – korzystamy z grafik legalnie.",
      "Plakat „Dbamy o naszą planetę”.",
      "Cyfrowy quiz klasowy – pytania, odpowiedzi i informacja zwrotna.",
      "Moje cyfrowe portfolio – wybieramy najlepsze prace.",
      "Wielka misja powtórkowa – stacje cyfrowych umiejętności.",
      "Bezpieczne wakacje z technologią – mój cyfrowy kompas.",
    ],
  },
  {
    id: "inf-6",
    subject: "INF",
    groups: ["6a", "6b"],
    topics: [
      "Zasady bezpiecznej pracy na lekcjach. Zapoznanie uczniów z wymaganiami edukacyjnymi z informatyki.",
      "Udostępniamy, współtworzymy, komentujemy.",
      "Prezentacja, która prowadzi odbiorcę.",
      "Obraz, dźwięk i film – dobieramy multimedia do przekazu.",
      "AI pod lupą – możliwości, ograniczenia i odpowiedzialność.",
      "Dobre pytanie, lepsza odpowiedź – tworzymy i poprawiamy polecenia.",
      "Od problemu do planu – układamy algorytm.",
      "Instrukcja, która działa – testujemy kroki rozwiązania.",
      "Zdarzenia i warunki – sterujemy bohaterem gry.",
      "Powtarzamy z sensem – pętle w działaniu.",
      "Punkty, czas i poziomy – zmienne w grze.",
      "Od pomysłu do gry – tworzymy i testujemy projekt.",
      "Jak sterować robotem? – planujemy trasę i wydajemy polecenia.",
      "Kodowanie w chmurze – rozwiązujemy zadania logiczne.",
      "Dane pod kontrolą – porządkujemy tabelę.",
      "Niech arkusz policzy – minimum, maksimum i średnia.",
      "Które dane mają znaczenie? – sortujemy i filtrujemy.",
      "Wykres dobrany do celu – pokazujemy wyniki i wyciągamy wnioski.",
      "Kadr ma znaczenie – poprawiamy kompozycję zdjęcia.",
      "Zdjęcie przed i po – retuszujemy z umiarem.",
      "Filtr czy poprawka? – świadomie zmieniamy obraz.",
      "Warstwy dają możliwości – budujemy fotomontaż.",
      "DBI: Zanim klikniesz – rozpoznajemy manipulację i oszustwa.",
      "DBI: Cyfrowy ślad – chronimy prywatność i reagujemy.",
      "Tworzymy szkolne zaproszenie – tekst, układ i grafika.",
      "Dokument z pomysłem – projektujemy papier firmowy.",
      "Tekst, który łatwo przeczytać – porządkujemy dłuższy dokument.",
      "Legalnie i uczciwie – dobieramy materiały do projektu.",
      "Cyfrowa mapa miejsca – tworzymy przewodnik z mapą 3D.",
      "Informacja w jednym spojrzeniu – tworzymy czytelną infografikę.",
      "Kampania z przesłaniem – projektujemy plakat społeczny.",
      "Kalendarz pełen pomysłów – projektujemy kalendarz klasowy.",
      "Kalendarz pełen pomysłów – projektujemy kalendarz klasowy.",
      "Nasza szkoła w sieci – tworzymy grafikę promocyjną.",
      "Pokaż, co potrafisz! – prezentujemy projekty.",
    ],
  },
];
const TOPIC_CUSTOM_VALUE = "__custom__";

const elements = {
  schoolYearStartDate: document.querySelector("#schoolYearStartDate"),
  schoolYearEnd: document.querySelector("#schoolYearEnd"),
  monthGrid: document.querySelector("#monthGrid"),
  dayGrid: document.querySelector("#dayGrid"),
  monthTitle: document.querySelector("#monthTitle"),
  monthMeta: document.querySelector("#monthMeta"),
  detailCard: document.querySelector("#detailCard"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  selectedDateSubtitle: document.querySelector("#selectedDateSubtitle"),
  dayStatusOptions: document.querySelector("#dayStatusOptions"),
  dayStatusLabel: document.querySelector("#dayStatusLabel"),
  dayNotes: document.querySelector("#dayNotes"),
  detailBody: document.querySelector("#detailBody"),
  clearDayButton: document.querySelector("#clearDayButton"),
  clearWeeklyPlanButton: document.querySelector("#clearWeeklyPlanButton"),
  addSubstituteLesson: document.querySelector("#addSubstituteLesson"),
  lessonList: document.querySelector("#lessonList"),
  weeklyPlan: document.querySelector("#weeklyPlan"),
  daysRemaining: document.querySelector("#daysRemaining"),
  teachingDaysRemaining: document.querySelector("#teachingDaysRemaining"),
  hoursRemaining: document.querySelector("#hoursRemaining"),
  weekdayStats: document.querySelector("#weekdayStats"),
  subjectStats: document.querySelector("#subjectStats"),
  subjectStatsMeta: document.querySelector("#subjectStatsMeta"),
  subjectSummary: document.querySelector("#subjectSummary"),
  topicProgress: document.querySelector("#topicProgress"),
  topicProgressMeta: document.querySelector("#topicProgressMeta"),
  topicSummary: document.querySelector("#topicSummary"),
  todayBadge: document.querySelector("#todayBadge"),
  jumpToToday: document.querySelector("#jumpToToday"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData"),
  importFile: document.querySelector("#importFile"),
  dataStatus: document.querySelector("#dataStatus"),
  authFields: document.querySelector("#authFields"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  signInButton: document.querySelector("#signInButton"),
  signUpButton: document.querySelector("#signUpButton"),
  signOutButton: document.querySelector("#signOutButton"),
  authStatus: document.querySelector("#authStatus"),
  syncStatus: document.querySelector("#syncStatus"),
  syncPanel: document.querySelector(".sync-panel"),
  lessonTemplate: document.querySelector("#lessonTemplate"),
};

const today = new Date();
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let state = loadState();
let selectedMonthIndex = 0;
let selectedDateKey = null;
let currentUser = null;
let cloudUnsubscribe = null;
let isApplyingRemoteState = false;
let saveTimeoutId = null;
let calendarRefreshTimeoutId = null;
let pendingRemoteRender = false;
let lastSerializedState = JSON.stringify(state);

init();

function init() {
  populateYearOptions();
  hydrateControls();
  ensureSelectedDate();
  bindEvents();
  render();
  initFirebaseSync();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      settings: {
        startDate: parsed.settings?.startDate ?? DEFAULT_START_DATE,
        endDate: parsed.settings?.endDate ?? DEFAULT_END_DATE,
      },
      entries: parsed.entries ?? {},
      weeklyPlan: normalizeWeeklyPlan(parsed.weeklyPlan),
    };
  }

  return {
    settings: {
      startDate: DEFAULT_START_DATE,
      endDate: DEFAULT_END_DATE,
    },
    entries: {},
    weeklyPlan: normalizeWeeklyPlan(),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  lastSerializedState = JSON.stringify(state);
  queueCloudSave();
}

function setDataStatus(message, isError = false) {
  if (!elements.dataStatus) {
    return;
  }

  elements.dataStatus.textContent = message;
  elements.dataStatus.classList.toggle("error", isError);
  elements.dataStatus.classList.toggle("success", Boolean(message) && !isError);
}

function populateYearOptions() {
}

function hydrateControls() {
  elements.schoolYearStartDate.value = state.settings.startDate;
  elements.schoolYearEnd.value = state.settings.endDate;
}

function bindEvents() {
  elements.schoolYearStartDate.addEventListener("change", () => {
    state.settings.startDate = elements.schoolYearStartDate.value || DEFAULT_START_DATE;
    selectedMonthIndex = 0;
    selectedDateKey = null;
    saveState();
    render();
  });

  elements.schoolYearEnd.addEventListener("change", () => {
    state.settings.endDate = elements.schoolYearEnd.value;
    saveState();
    render();
  });

  elements.dayNotes.addEventListener("input", () => {
    if (!selectedDateKey) {
      return;
    }
    const entry = getSelectedEntry();
    entry.notes = elements.dayNotes.value;
    persistEntryWithoutUiRefresh(entry);
    scheduleCalendarOnlyRefresh();
  });

  elements.dayStatusOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button || !selectedDateKey) {
      return;
    }

    const entry = getSelectedEntry();
    entry.dayStatusType = button.dataset.status ?? "";
    state.entries[selectedDateKey] = entry;
    saveState();
    syncStatusChips(entry.dayStatusType);
    renderSummary();
    renderDays();
    renderDayDetails();
  });

  elements.dayStatusLabel.addEventListener("input", () => {
    if (!selectedDateKey) {
      return;
    }
    const entry = getSelectedEntry();
    entry.dayStatusLabel = elements.dayStatusLabel.value;
    persistEntryWithoutUiRefresh(entry);
    scheduleCalendarOnlyRefresh();
  });

  elements.clearDayButton?.addEventListener("click", clearSelectedDay);
  elements.clearWeeklyPlanButton?.addEventListener("click", clearWeeklyPlan);
  elements.addSubstituteLesson?.addEventListener("click", addSubstituteLesson);

  elements.jumpToToday.addEventListener("click", goToTodayIfInYear);
  bindCollapsibleSummary(elements.subjectSummary, "school-year-subject-summary-open");
  bindCollapsibleSummary(elements.topicSummary, "school-year-topic-summary-open");

  if (elements.exportData) {
    elements.exportData.addEventListener("click", exportPlannerData);
  }

  if (elements.importData && elements.importFile) {
    elements.importData.addEventListener("click", () => elements.importFile.click());
    elements.importFile.addEventListener("change", importPlannerData);
  }

  elements.signInButton?.addEventListener("click", handleSignIn);
  elements.signUpButton?.addEventListener("click", handleSignUp);
  elements.signOutButton?.addEventListener("click", handleSignOut);
}

function render() {
  renderMonths();
  renderWeeklyPlan();
  renderDays();
  renderDayDetails();
  renderSummary();
}

function exportPlannerData() {
  const payload = {
    app: "school-year-planner",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `kalendarz-roku-szkolnego-${dateStamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  setDataStatus("Dane zostały zapisane do pliku JSON.");
}

function importPlannerData(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      state = normalizeImportedState(parsed?.state ?? parsed);
      hydrateControls();
      ensureSelectedDate();
      saveState();
      render();
      setDataStatus("Dane zostały wczytane z pliku.");
    } catch (error) {
      setDataStatus("Nie udało się wczytać pliku. Wybierz poprawny eksport kalendarza.", true);
    } finally {
      elements.importFile.value = "";
    }
  };

  reader.readAsText(file, "utf-8");
}

function normalizeImportedState(rawState) {
  return {
    settings: {
      startDate: rawState?.settings?.startDate ?? DEFAULT_START_DATE,
      endDate: rawState?.settings?.endDate ?? DEFAULT_END_DATE,
    },
    entries: rawState?.entries && typeof rawState.entries === "object" ? rawState.entries : {},
    weeklyPlan: normalizeWeeklyPlan(rawState?.weeklyPlan),
  };
}

function getCustomDayStatusInfo(dateKey) {
  const entry = getEntry(dateKey);
  if (!entry.dayStatusType) {
    return null;
  }

  if (entry.dayStatusType === "no-didactic") {
    const label = entry.dayStatusLabel?.trim();
    return {
      name: label || "Wolny od dydaktyki",
      short: label || "wolny",
      type: "no-didactic",
      source: "custom",
    };
  }

  if (entry.dayStatusType === "free-day") {
    const label = entry.dayStatusLabel?.trim();
    return {
      name: label || "Dzień wolny",
      short: label || "wolne",
      type: "free-day",
      source: "custom",
    };
  }

  return null;
}

function initFirebaseSync() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateAuthUi();

    if (cloudUnsubscribe) {
      cloudUnsubscribe();
      cloudUnsubscribe = null;
    }

    if (!user) {
      setAuthStatus("Dane są teraz zapisywane lokalnie w tej przeglądarce.");
      setSyncStatus("");
      return;
    }

    setAuthStatus(`Zalogowano jako ${user.email}.`);
    await loadCloudStateOrSeed();
    startCloudSubscription();
  });
}

async function handleSignIn() {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    setAuthStatus("Wpisz email i hasło, żeby się zalogować.", true);
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    elements.authPassword.value = "";
    setAuthStatus("Logowanie udane.");
  } catch (error) {
    setAuthStatus(getAuthErrorMessage(error), true);
  }
}

async function handleSignUp() {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    setAuthStatus("Wpisz email i hasło, żeby założyć konto.", true);
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    elements.authPassword.value = "";
    setAuthStatus("Konto zostało utworzone i od razu Cię zalogowałam.");
  } catch (error) {
    setAuthStatus(getAuthErrorMessage(error), true);
  }
}

async function handleSignOut() {
  await signOut(auth);
  setAuthStatus("Wylogowano. Kalendarz działa dalej lokalnie.");
}

function updateAuthUi() {
  const loggedIn = Boolean(currentUser);
  elements.signOutButton.hidden = !loggedIn;
  elements.signInButton.hidden = loggedIn;
  elements.signUpButton.hidden = loggedIn;
  elements.authEmail.disabled = loggedIn;
  elements.authPassword.disabled = loggedIn;
  elements.authFields.hidden = loggedIn;
  elements.syncPanel.classList.toggle("compact", loggedIn);

  if (loggedIn) {
    elements.authEmail.value = currentUser.email ?? "";
    elements.authPassword.value = "";
  }
}

function setAuthStatus(message, isError = false) {
  if (!elements.authStatus) {
    return;
  }

  elements.authStatus.textContent = message;
  elements.authStatus.classList.toggle("error", isError);
  elements.authStatus.classList.toggle("success", Boolean(message) && !isError);
}

function setSyncStatus(message, isError = false) {
  if (!elements.syncStatus) {
    return;
  }

  elements.syncStatus.textContent = message;
  elements.syncStatus.classList.toggle("error", isError);
  elements.syncStatus.classList.toggle("success", Boolean(message) && !isError);
}

async function loadCloudStateOrSeed() {
  const plannerRef = getPlannerDocRef();
  const snapshot = await getDoc(plannerRef);

  if (!snapshot.exists()) {
    await saveStateToCloud(true);
    setSyncStatus("Utworzyłam Twoją chmurową kopię kalendarza.");
    return;
  }

  const remoteState = snapshot.data()?.state;
  if (!remoteState) {
    await saveStateToCloud(true);
    setSyncStatus("Chmura była pusta, więc wysłałam tam aktualny kalendarz.");
    return;
  }

  applyRemoteState(remoteState);
  setSyncStatus("Wczytałam dane z chmury. Ten sam kalendarz zobaczysz też w szkole.");
}

function startCloudSubscription() {
  const plannerRef = getPlannerDocRef();

  cloudUnsubscribe = onSnapshot(plannerRef, (snapshot) => {
    if (!snapshot.exists()) {
      return;
    }

    const remoteState = snapshot.data()?.state;
    if (!remoteState) {
      return;
    }

    const serializedRemoteState = JSON.stringify(normalizeImportedState(remoteState));
    if (serializedRemoteState === lastSerializedState) {
      return;
    }

    applyRemoteState(remoteState);
    setSyncStatus("Kalendarz zsynchronizował się z chmurą.");
  });
}

function applyRemoteState(remoteState) {
  const previousDateKey = selectedDateKey;
  const previousMonthIndex = selectedMonthIndex;

  isApplyingRemoteState = true;
  state = normalizeImportedState(remoteState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  lastSerializedState = JSON.stringify(state);
  hydrateControls();

  if (previousDateKey) {
    selectedDateKey = previousDateKey;
    selectedMonthIndex = previousMonthIndex;
  } else {
    ensureSelectedDate();
  }

  if (isEditingPlannerFields()) {
    pendingRemoteRender = true;
    isApplyingRemoteState = false;
    return;
  }

  pendingRemoteRender = false;
  render();
  isApplyingRemoteState = false;
}

function isEditingPlannerFields() {
  const active = document.activeElement;
  if (!active) {
    return false;
  }

  const tag = active.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
    return false;
  }

  return Boolean(
    active.closest("#detailBody") ||
      active.closest("#weeklyPlan") ||
      active === elements.dayStatusLabel ||
      active === elements.dayNotes,
  );
}

function flushPendingRemoteRender() {
  if (!pendingRemoteRender || isEditingPlannerFields()) {
    return;
  }

  pendingRemoteRender = false;
  render();
}

function queueCloudSave() {
  if (!currentUser || isApplyingRemoteState) {
    return;
  }

  window.clearTimeout(saveTimeoutId);
  setSyncStatus("Zapisywanie zmian do chmury...");
  saveTimeoutId = window.setTimeout(() => {
    saveStateToCloud().catch(() => {
      setSyncStatus("Nie udało się zapisać zmian online. Dane nadal są lokalnie.", true);
    });
  }, 700);
}

async function saveStateToCloud(silent = false) {
  if (!currentUser) {
    return;
  }

  await setDoc(
    getPlannerDocRef(),
    {
      email: currentUser.email ?? "",
      state: normalizeImportedState(state),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (!silent) {
    setSyncStatus("Zmiany zapisane online.");
  }
}

function getPlannerDocRef() {
  return doc(db, "planners", currentUser.uid);
}

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "To konto już istnieje. Zaloguj się tym emailem.";
    case "auth/invalid-email":
      return "Ten email wygląda na niepoprawny.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Nie udało się zalogować. Sprawdź email i hasło.";
    case "auth/weak-password":
      return "Hasło jest za słabe. Użyj dłuższego hasła.";
    case "auth/too-many-requests":
      return "Za dużo prób. Spróbuj ponownie za chwilę.";
    default:
      return "Coś poszło nie tak przy logowaniu. Spróbuj jeszcze raz.";
  }
}

function renderMonths() {
  const startYear = getSchoolYearStart().getFullYear();

  elements.monthGrid.innerHTML = calendarMonths
    .map((month, index) => {
      const year = month >= 8 ? startYear : startYear + 1;
      const days = getDaysForMonth(year, month);
      const lessonCount = days.reduce((total, day) => total + getScheduledLessonsForDate(day.date).length, 0);
      const canceledLessons = days.reduce((total, day) => {
        const entry = getEntry(day.dateKey);
        return total + Object.values(entry.lessonData).filter((lesson) => lesson.canceled).length;
      }, 0);

      return `
        <button class="month-button ${index === selectedMonthIndex ? "active" : ""}" type="button" data-month-index="${index}">
          <span class="month-name">${monthNames[index]}</span>
          <span class="month-meta">${year}</span>
          <span class="month-meta">${lessonCount} lekcji, ${canceledLessons} nieodbytych</span>
        </button>
      `;
    })
    .join("");

  elements.monthGrid.querySelectorAll(".month-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMonthIndex = Number(button.dataset.monthIndex);
      selectedDateKey = null;
      render();
    });
  });
}

function renderWeeklyPlan() {
  const startDate = getSchoolYearStart();
  const endDate = getSchoolYearEnd();
  trackedWeekdays.forEach(({ day }) => {
    state.weeklyPlan[day] = ensureLessonSlots(state.weeklyPlan[day]);
  });

  elements.weeklyPlan.innerHTML = `
    <div class="weekly-plan-grid">
      <div class="weekly-plan-grid-head corner">Nr</div>
      ${trackedWeekdays
        .map(({ day, short }) => `
          <div class="weekly-plan-grid-head">
            <strong>${short}</strong>
            <span>${countRemainingOccurrences(day, startDate, endDate)}</span>
            <button
              class="ghost-button clear-weekday-button"
              type="button"
              data-clear-weekday="${day}"
            >
              Wyczyść
            </button>
          </div>
        `)
        .join("")}
      ${Array.from({ length: DEFAULT_LESSON_SLOTS }, (_, index) => `
        <div class="weekly-plan-slot">${index + 1}.</div>
        ${trackedWeekdays
          .map(({ day }) => {
            const lesson = state.weeklyPlan[day][index];
            return `
              <div class="weekly-plan-cell">
                <input
                  data-weekly-day="${day}"
                  data-weekly-index="${index}"
                  data-weekly-field="group"
                  type="text"
                  value="${escapeHtml(lesson.group)}"
                >
                <input
                  data-weekly-day="${day}"
                  data-weekly-index="${index}"
                  data-weekly-field="subject"
                  type="text"
                  value="${escapeHtml(lesson.subject)}"
                >
              </div>
            `;
          })
          .join("")}
      `).join("")}
    </div>
  `;

  elements.weeklyPlan.querySelectorAll("[data-weekly-field]").forEach((field) => {
    field.addEventListener("input", () => {
      const day = Number(field.dataset.weeklyDay);
      const index = Number(field.dataset.weeklyIndex);
      const key = field.dataset.weeklyField;
      state.weeklyPlan[day][index][key] = field.value;
      saveState();
      scheduleCalendarOnlyRefresh();
    });

    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      const day = Number(field.dataset.weeklyDay);
      const index = Number(field.dataset.weeklyIndex);
      const key = field.dataset.weeklyField;
      const nextIndex = event.shiftKey ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= DEFAULT_LESSON_SLOTS) {
        return;
      }

      const nextField = elements.weeklyPlan.querySelector(
        `[data-weekly-day="${day}"][data-weekly-index="${nextIndex}"][data-weekly-field="${key}"]`,
      );
      nextField?.focus();
      nextField?.select();
    });
  });

  elements.weeklyPlan.querySelectorAll("[data-clear-weekday]").forEach((button) => {
    button.addEventListener("click", () => {
      const day = Number(button.dataset.clearWeekday);
      clearWeeklyPlanDay(day);
    });
  });
}

function clearWeeklyPlanDay(day) {
  state.weeklyPlan[day] = ensureLessonSlots([]);
  saveState();
  renderWeeklyPlan();
  renderSummary();
  renderDays();
  if (selectedDateKey) {
    renderDayDetails();
  }
}

function clearWeeklyPlan() {
  trackedWeekdays.forEach(({ day }) => {
    state.weeklyPlan[day] = ensureLessonSlots([]);
  });
  saveState();
  renderWeeklyPlan();
  renderSummary();
  renderDays();
  if (selectedDateKey) {
    renderDayDetails();
  }
}

function isDayRealized(date, dateKey) {
  const lessons = getScheduledLessonsForDate(date);
  if (!lessons.length) {
    return false;
  }

  const entry = getEntry(dateKey);
  return lessons.every((_, index) => {
    const dayLesson = getDayLessonData(entry, index);
    return dayLesson.completed || dayLesson.canceled;
  });
}

function renderDays() {
  const monthDate = getMonthDateByIndex(selectedMonthIndex);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const weekdaysOnly = getDaysForMonth(year, month).filter((day) => !isWeekend(day.date));
  const headers = ["Pn", "Wt", "Śr", "Czw", "Pt"];
  const firstDay = weekdaysOnly[0]?.date;
  const firstWeekdayIndex = firstDay ? Math.max(0, firstDay.getDay() - 1) : 0;

  elements.monthTitle.textContent = `${monthNames[selectedMonthIndex]} ${year}`;
  elements.monthMeta.textContent = `Kliknij dzień, aby wpisać lekcje, tematy i notatki.`;

  const headerMarkup = headers.map((label) => `<div class="weekday-header">${label}</div>`).join("");
  const placeholderMarkup = Array.from({ length: firstWeekdayIndex }, () => '<div class="day-placeholder"></div>').join("");
  const dayMarkup = weekdaysOnly
    .map((day) => {
      const free = isFreeDay(day.date);
      const plannedCount = free ? 0 : getScheduledLessonsForDate(day.date).length;
      const extraCount = getExtraLessons(day.dateKey).length;
      const notesPreview = getCalendarNotePreview(day.dateKey);
      const holidayInfo = getResolvedHolidayInfo(day.date);
      const freeKind = holidayInfo?.type === "no-didactic" ? "no-didactic" : free ? "free-day" : "";
      const freeReason = free && holidayInfo
        ? escapeHtml(holidayInfo.name || holidayInfo.short || "wolne")
        : "";
      const hourBadge = plannedCount > 0
        ? `<span class="badge lessons badge-hours">${plannedCount} godz.</span>`
        : "";
      const extraBadge = extraCount > 0
        ? `<span class="badge lessons badge-extra">+${extraCount}</span>`
        : "";
      const realized = !free && isDayRealized(day.date, day.dateKey);

      return `
        <button
          class="day-button ${selectedDateKey === day.dateKey ? "active" : ""} ${freeKind} ${realized ? "realized" : ""}"
          type="button"
          data-date-key="${day.dateKey}"
        >
          <span class="day-number">${day.date.getDate()}</span>
          <span class="day-name">${weekdayNames[day.date.getDay()]}</span>
          <div class="day-badges">
            ${hourBadge}${extraBadge}
          </div>
          ${freeReason ? `<div class="day-topics"><span class="day-topic free-day-reason">${freeReason}</span></div>` : ""}
          ${notesPreview.length ? `<div class="day-topics">${notesPreview.map((note) => `<span class="day-topic">${escapeHtml(note)}</span>`).join("")}</div>` : ""}
        </button>
      `;
    })
    .join("");

  elements.dayGrid.innerHTML = `${headerMarkup}${placeholderMarkup}${dayMarkup}`;

  elements.dayGrid.querySelectorAll(".day-button").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectedDateKey = button.dataset.dateKey;
      window.clearTimeout(calendarRefreshTimeoutId);
      calendarRefreshTimeoutId = null;
      renderDays();
      renderDayDetails();
    });
  });
}

function syncStatusChips(statusType = "") {
  if (!elements.dayStatusOptions) {
    return;
  }

  elements.dayStatusOptions.querySelectorAll("[data-status]").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === statusType);
  });
}

function clearSelectedDay() {
  if (!selectedDateKey) {
    return;
  }

  delete state.entries[selectedDateKey];
  saveState();
  renderSummary();
  renderDays();
  renderDayDetails();
}

function createExtraLesson() {
  return {
    subject: "",
    group: "",
    topic: "",
    notes: "",
    completed: false,
    canceled: false,
    canceledReason: "",
    substitute: true,
    substituteNote: "",
  };
}

function getExtraLessons(dateKey) {
  const saved = state.entries[dateKey]?.extraLessons;
  return Array.isArray(saved) ? saved.map((lesson) => normalizeExtraLesson(lesson)) : [];
}

function normalizeExtraLesson(lesson = {}) {
  return {
    subject: lesson.subject ?? "",
    group: lesson.group ?? "",
    topic: lesson.topic ?? "",
    notes: lesson.notes ?? "",
    completed: Boolean(lesson.completed),
    canceled: Boolean(lesson.canceled),
    canceledReason: lesson.canceledReason ?? "",
    substitute: lesson.substitute !== false,
    substituteNote: lesson.substituteNote ?? "",
  };
}

function addSubstituteLesson() {
  if (!selectedDateKey) {
    return;
  }

  const entry = getSelectedEntry();
  entry.extraLessons = [...getExtraLessons(selectedDateKey), createExtraLesson()];
  persistEntryWithoutUiRefresh(entry);
  renderDayDetails();
  renderDays();
  renderSummary();
}

function removeExtraLesson(index) {
  if (!selectedDateKey) {
    return;
  }

  const entry = getSelectedEntry();
  entry.extraLessons = getExtraLessons(selectedDateKey).filter((_, itemIndex) => itemIndex !== index);
  persistEntryWithoutUiRefresh(entry);
  renderDayDetails();
  renderDays();
  renderSummary();
}

function bindLessonFields(clone, getLesson, saveLesson) {
  clone.querySelectorAll("[data-field]").forEach((field) => {
    const key = field.dataset.field;
    const lesson = getLesson();

    if (field.type === "checkbox") {
      field.checked = Boolean(lesson[key]);
    } else {
      field.value = lesson[key] ?? "";
    }

    field.addEventListener("input", () => {
      const currentLesson = getLesson();
      currentLesson[key] = field.type === "checkbox" ? field.checked : field.value;
      saveLesson(currentLesson);
      if (field.type !== "checkbox") {
        scheduleCalendarOnlyRefresh();
      }
      if (key === "topic") {
        renderTopicProgress();
      }
    });

    if (field.type === "checkbox") {
      field.addEventListener("change", () => {
        const currentLesson = getLesson();
        currentLesson[key] = field.checked;
        saveLesson(currentLesson);
        renderSummary();
        renderDays();
      });
    }
  });
}

function renderDayDetails() {
  if (!selectedDateKey) {
    elements.detailCard.classList.add("detail-card-empty");
    elements.detailBody.hidden = true;
    if (elements.clearDayButton) {
      elements.clearDayButton.hidden = true;
    }
    elements.selectedDateTitle.textContent = "Szczegóły dnia";
    elements.selectedDateSubtitle.textContent = "Kliknij dzień w kalendarzu, aby wpisać temat lekcji i zaznaczenia.";
    return;
  }

  elements.detailCard.classList.remove("detail-card-empty");
  elements.detailBody.hidden = false;
  if (elements.clearDayButton) {
    elements.clearDayButton.hidden = false;
  }
  const date = parseDateKey(selectedDateKey);
  const entry = getSelectedEntry();
  const lessons = getScheduledLessonsForDate(date);
  const extraLessons = getExtraLessons(selectedDateKey);
  const weekdayProgress = getWeekdayProgress(date);

  elements.selectedDateTitle.textContent = formatLongDate(date);
  elements.selectedDateSubtitle.textContent = buildSelectedDateSubtitleResolved(date, weekdayProgress);
  elements.dayStatusLabel.disabled = false;
  elements.dayNotes.disabled = false;
  syncStatusChips(entry.dayStatusType ?? "");

  if (document.activeElement !== elements.dayStatusLabel) {
    elements.dayStatusLabel.value = entry.dayStatusLabel ?? "";
  }
  if (document.activeElement !== elements.dayNotes) {
    elements.dayNotes.value = entry.notes ?? "";
  }
  elements.lessonList.innerHTML = "";
  elements.lessonList.classList.add("compact-lessons");

  if (!lessons.length && !extraLessons.length) {
    elements.lessonList.innerHTML = '<p class="empty-state">Na ten dzień nie ma lekcji w stałym planie. Możesz dodać zastępstwo albo zostawić notatkę.</p>';
  }

  lessons.forEach((lesson, index) => {
    const clone = elements.lessonTemplate.content.firstElementChild.cloneNode(true);
    clone.querySelector(".lesson-label").textContent = `${lesson.subject || "Bez przedmiotu"}${lesson.group ? ` • ${lesson.group}` : ""}`;
    clone.querySelector(".extra-lesson-fields").hidden = true;
    clone.querySelector(".remove-extra-lesson").hidden = true;

    bindLessonFields(
      clone,
      () => getDayLessonData(getSelectedEntry(), index),
      (currentLesson) => {
        const currentEntry = getSelectedEntry();
        currentEntry.lessonData[index] = currentLesson;
        persistEntryWithoutUiRefresh(currentEntry);
      },
    );
    setupTopicField(clone, lesson.subject, lesson.group);

    elements.lessonList.appendChild(clone);
  });

  extraLessons.forEach((lesson, index) => {
    const clone = elements.lessonTemplate.content.firstElementChild.cloneNode(true);
    const label = `${lesson.subject || "Zastępstwo"}${lesson.group ? ` • ${lesson.group}` : ""}`;
    clone.querySelector(".lesson-label").textContent = label;
    clone.classList.add("extra-lesson-item");

    const extraFields = clone.querySelector(".extra-lesson-fields");
    extraFields.hidden = false;
    extraFields.querySelectorAll("[data-extra-field]").forEach((field) => {
      const key = field.dataset.extraField;
      field.value = lesson[key] ?? "";
      field.addEventListener("input", () => {
        const currentEntry = getSelectedEntry();
        const extras = getExtraLessons(selectedDateKey);
        extras[index] = {
          ...extras[index],
          [key]: field.value,
        };
        currentEntry.extraLessons = extras;
        persistEntryWithoutUiRefresh(currentEntry);
        clone.querySelector(".lesson-label").textContent =
          `${extras[index].subject || "Zastępstwo"}${extras[index].group ? ` • ${extras[index].group}` : ""}`;
        setupTopicField(clone, extras[index].subject, extras[index].group);
        renderTopicProgress();
        scheduleCalendarOnlyRefresh();
      });
    });

    const removeButton = clone.querySelector(".remove-extra-lesson");
    removeButton.hidden = false;
    removeButton.addEventListener("click", () => removeExtraLesson(index));

    bindLessonFields(
      clone,
      () => getExtraLessons(selectedDateKey)[index],
      (currentLesson) => {
        const currentEntry = getSelectedEntry();
        const extras = getExtraLessons(selectedDateKey);
        extras[index] = {
          ...extras[index],
          ...currentLesson,
          subject: extras[index].subject,
          group: extras[index].group,
        };
        currentEntry.extraLessons = extras;
        persistEntryWithoutUiRefresh(currentEntry);
      },
    );
    setupTopicField(clone, lesson.subject, lesson.group);

    elements.lessonList.appendChild(clone);
  });
}

function renderSummary() {
  const startDate = getSchoolYearStart();
  const endDate = getSchoolYearEnd();
  const weekdayCounts = calculateWeekdayCounts(startDate, endDate);
  const classCounts = calculateClassLessonCounts(startDate, endDate);

  const totalHours = classCounts.reduce((sum, item) => sum + item.count, 0);

  elements.daysRemaining.textContent = String(calculateDaysRemaining(startDate, endDate));
  elements.teachingDaysRemaining.textContent = String(calculateTeachingDaysRemaining(startDate, endDate));
  if (elements.hoursRemaining) {
    elements.hoursRemaining.textContent = String(totalHours);
  }
  elements.weekdayStats.innerHTML = trackedWeekdays
    .map(({ day, short }) => `<div class="weekday-pill"><strong>${weekdayCounts[day]}</strong><span>${short}</span></div>`)
    .join("");
  const itSubjects = ["EK", "INF", "ZR", "AI"];
  const techSubjects = ["TECH", "ZPT", "KT", "MZM"];
  const itOrder = new Map(itSubjects.map((label, index) => [label, index]));
  const techOrder = new Map(techSubjects.map((label, index) => [label, index]));

  const sortBySubject = (orderMap) => (left, right) =>
    (orderMap.get(left.subjectLabel) ?? 99) - (orderMap.get(right.subjectLabel) ?? 99) ||
    left.groupLabel.localeCompare(right.groupLabel, "pl", { numeric: true });

  const itCounts = classCounts
    .filter((item) => itSubjects.includes(item.subjectLabel))
    .sort(sortBySubject(itOrder));
  const techCounts = classCounts
    .filter((item) => techSubjects.includes(item.subjectLabel) || !itSubjects.includes(item.subjectLabel))
    .filter((item) => !itSubjects.includes(item.subjectLabel))
    .sort(sortBySubject(techOrder));

  const renderPill = ({ label, count, subjectLabel }) =>
    `<div class="subject-pill ${getLessonBadgeClass(subjectLabel)}"><strong>${count}</strong><span>${escapeHtml(label)}</span></div>`;

  elements.subjectStats.innerHTML = classCounts.length
    ? `
      <div class="subject-stats-column">
        <p class="subject-stats-heading">Informatyczne</p>
        ${itCounts.length ? itCounts.map(renderPill).join("") : '<p class="subject-empty">Brak wpisów</p>'}
      </div>
      <div class="subject-stats-column">
        <p class="subject-stats-heading">Techniczne</p>
        ${techCounts.length ? techCounts.map(renderPill).join("") : '<p class="subject-empty">Brak wpisów</p>'}
      </div>
    `
    : '<p class="subject-empty">Wpisz plan, a tutaj pokażą się godziny dla każdej klasy.</p>';

  if (elements.subjectStatsMeta) {
    elements.subjectStatsMeta.textContent = classCounts.length
      ? `${classCounts.length} klas — szczegóły`
      : "";
  }

  elements.todayBadge.textContent = `Liczenie od: ${formatLongDate(startDate)}`;
  renderTopicProgress();
}

function bindCollapsibleSummary(details, storageKey) {
  if (!details || !storageKey) {
    return;
  }

  details.open = localStorage.getItem(storageKey) === "1";
  details.addEventListener("toggle", () => {
    localStorage.setItem(storageKey, details.open ? "1" : "0");
  });
}

function getTopicListSubjects(list) {
  return Array.isArray(list.subjects) && list.subjects.length
    ? list.subjects
    : [list.subject];
}

function topicListMatchesSubject(list, subjectLabel) {
  return getTopicListSubjects(list).includes(subjectLabel);
}

function findTopicList(subject = "", group = "") {
  const subjectLabel = getSubjectShortLabel(subject);
  const groupLabel = normalizeGroupLabel(group);

  return TOPIC_LISTS.find(
    (list) =>
      topicListMatchesSubject(list, subjectLabel) &&
      list.groups.some((item) => normalizeGroupLabel(item) === groupLabel),
  ) ?? null;
}

function formatNumberedTopic(number, topic) {
  return `${number}. ${topic}`;
}

function normalizeTopicText(topic = "") {
  return String(topic)
    .trim()
    .replace(/^\d{1,3}\.\s*/, "")
    .trim();
}

function findTopicIndex(list, topicValue) {
  const raw = String(topicValue || "").trim();
  if (!raw) {
    return -1;
  }

  const byNumber = list.topics.findIndex(
    (topic, index) => formatNumberedTopic(index + 1, topic) === raw,
  );
  if (byNumber >= 0) {
    return byNumber;
  }

  const normalized = normalizeTopicText(raw);
  return list.topics.findIndex((topic) => topic.trim() === normalized);
}

function setupTopicField(clone, subject, group) {
  const topicInput = clone.querySelector('[data-field="topic"]');
  const topicSelect = clone.querySelector(".topic-select");
  const hint = clone.querySelector(".topic-field-hint");
  if (!topicInput || !topicSelect) {
    return;
  }

  const list = findTopicList(subject, group);
  if (!list) {
    topicSelect.hidden = true;
    topicSelect.innerHTML = "";
    topicInput.hidden = false;
    topicInput.classList.remove("topic-custom-input");
    topicInput.placeholder = "Temat";
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
    }
    return;
  }

  const groupLabel = normalizeGroupLabel(group);
  const progress = getTopicProgressForGroup(list, groupLabel);
  const usedIndexes = getUsedCatalogTopicIndexes(list, groupLabel);
  const currentValue = topicInput.value;
  const matchedIndex = findTopicIndex(list, currentValue);
  const isCustom = Boolean(currentValue.trim()) && matchedIndex < 0;
  const remainingCount = list.topics.filter(
    (_, index) => !usedIndexes.has(index) || index === matchedIndex,
  ).length;

  topicSelect.hidden = false;
  topicSelect.dataset.topicSubject = subject;
  topicSelect.dataset.topicGroup = group;
  topicSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = `Wybierz temat (${remainingCount} z ${list.topics.length})`;
  topicSelect.appendChild(placeholder);

  list.topics.forEach((topic, index) => {
    if (usedIndexes.has(index) && index !== matchedIndex) {
      return;
    }

    const option = document.createElement("option");
    const numbered = formatNumberedTopic(index + 1, topic);
    option.value = numbered;
    option.textContent = numbered;
    topicSelect.appendChild(option);
  });

  const customOption = document.createElement("option");
  customOption.value = TOPIC_CUSTOM_VALUE;
  customOption.textContent = "Własny temat…";
  topicSelect.appendChild(customOption);

  topicSelect.value = isCustom
    ? TOPIC_CUSTOM_VALUE
    : matchedIndex >= 0
      ? formatNumberedTopic(matchedIndex + 1, list.topics[matchedIndex])
      : "";

  topicInput.hidden = !isCustom;
  topicInput.classList.toggle("topic-custom-input", true);
  topicInput.placeholder = isCustom ? "Wpisz własny temat" : "Temat";

  if (!topicSelect.dataset.bound) {
    topicSelect.dataset.bound = "1";
    topicSelect.addEventListener("change", () => {
      if (topicSelect.value === TOPIC_CUSTOM_VALUE) {
        topicInput.hidden = false;
        topicInput.value = "";
        topicInput.focus();
        topicInput.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }

      topicInput.hidden = true;
      topicInput.value = topicSelect.value;
      topicInput.dispatchEvent(new Event("input", { bubbles: true }));
      renderTopicProgress();
      setupTopicField(
        clone,
        topicSelect.dataset.topicSubject || subject,
        topicSelect.dataset.topicGroup || group,
      );
    });
  }

  if (hint) {
    hint.hidden = false;
    hint.textContent = `${progress.used}/${progress.total}`;
  }
}

function getUsedCatalogTopicIndexes(list, groupLabel) {
  const used = new Set();

  Object.entries(state.entries).forEach(([dateKey, entry]) => {
    const date = parseDateKey(dateKey);
    const scheduled = getScheduledLessonsForDate(date);

    scheduled.forEach((lesson, index) => {
      if (!topicListMatchesSubject(list, getSubjectShortLabel(lesson.subject))) {
        return;
      }
      if (normalizeGroupLabel(lesson.group) !== groupLabel) {
        return;
      }

      const dayLesson = getDayLessonData(entry, index);
      if (dayLesson.canceled) {
        return;
      }

      const topicIndex = findTopicIndex(list, dayLesson.topic);
      if (topicIndex >= 0) {
        used.add(topicIndex);
      }
    });

    getExtraLessons(dateKey).forEach((lesson) => {
      if (!topicListMatchesSubject(list, getSubjectShortLabel(lesson.subject))) {
        return;
      }
      if (normalizeGroupLabel(lesson.group) !== groupLabel) {
        return;
      }
      if (lesson.canceled) {
        return;
      }

      const topicIndex = findTopicIndex(list, lesson.topic);
      if (topicIndex >= 0) {
        used.add(topicIndex);
      }
    });
  });

  return used;
}

function getTopicProgressForGroup(list, groupLabel) {
  const used = getUsedCatalogTopicIndexes(list, groupLabel);
  return {
    used: used.size,
    total: list.topics.length,
  };
}

function renderTopicProgress() {
  if (!elements.topicProgress) {
    return;
  }

  const items = [];
  TOPIC_LISTS.forEach((list) => {
    list.groups.forEach((group) => {
      const groupLabel = normalizeGroupLabel(group);
      const progress = getTopicProgressForGroup(list, groupLabel);
      items.push({
        label: `${groupLabel} • ${list.subject}`,
        used: progress.used,
        total: progress.total,
        subjectLabel: list.subject,
      });
    });
  });

  elements.topicProgress.innerHTML = items.length
    ? items
        .map(
          (item) =>
            `<div class="topic-progress-pill ${getLessonBadgeClass(item.subjectLabel)}"><strong>${item.used}/${item.total}</strong><span>${escapeHtml(item.label)}</span></div>`,
        )
        .join("")
    : '<p class="subject-empty">Brak list tematów.</p>';

  if (elements.topicProgressMeta) {
    if (!items.length) {
      elements.topicProgressMeta.textContent = "";
    } else {
      const used = items.reduce((sum, item) => sum + item.used, 0);
      const total = items.reduce((sum, item) => sum + item.total, 0);
      elements.topicProgressMeta.textContent = `${items.length} list · ${used}/${total}`;
    }
  }
}

function calculateDaysRemaining(startDate, endDate) {
  if (startDate > endDate) {
    return 0;
  }

  return Math.floor((endDate - startDate) / 86400000) + 1;
}

function calculateTeachingDaysRemaining(startDate, endDate) {
  let count = 0;
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    if (!isFreeDay(pointer)) {
      count += 1;
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return count;
}

function calculateLessonsRemaining(startDate, endDate) {
  let count = 0;
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    const lessons = getScheduledLessonsForDate(pointer);
    const entry = getEntry(buildDateKey(pointer));
    count += lessons.filter((_, index) => {
      const dayLesson = getDayLessonData(entry, index);
      return !dayLesson.completed && !dayLesson.canceled;
    }).length;
    pointer.setDate(pointer.getDate() + 1);
  }

  return count;
}

function calculateClassLessonCounts(startDate, endDate) {
  const counts = new Map();
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    const lessons = getScheduledLessonsForDate(pointer);
    const entry = getEntry(buildDateKey(pointer));

    lessons.forEach((lesson, index) => {
      const dayLesson = getDayLessonData(entry, index);
      if (dayLesson.completed || dayLesson.canceled) {
        return;
      }

      const subjectLabel = getSubjectShortLabel(lesson.subject);
      const groupLabel = normalizeGroupLabel(lesson.group);
      const key = `${groupLabel}__${subjectLabel}`;
      const existing = counts.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          label: `${groupLabel} • ${subjectLabel}`,
          count: 1,
          groupLabel,
          subjectLabel,
        });
      }
    });

    pointer.setDate(pointer.getDate() + 1);
  }

  return Array.from(counts.values()).sort(
    (left, right) =>
      left.groupLabel.localeCompare(right.groupLabel, "pl", { numeric: true }) ||
      left.subjectLabel.localeCompare(right.subjectLabel, "pl") ||
      right.count - left.count,
  );
}

function normalizeGroupLabel(group = "") {
  const cleaned = group.trim();

  if (!cleaned) {
    return "bez klasy";
  }

  return cleaned.replace(/\s+/g, "").toLowerCase();
}

function calculateWeekdayCounts(startDate, endDate) {
  const counts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    const day = pointer.getDay();
    if (counts[day] !== undefined && !isFreeDay(pointer)) {
      counts[day] += 1;
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return counts;
}

function persistEntryWithoutUiRefresh(entry) {
  if (!selectedDateKey) {
    return;
  }

  state.entries[selectedDateKey] = entry;
  saveState();
}

function scheduleCalendarOnlyRefresh() {
  window.clearTimeout(calendarRefreshTimeoutId);
  calendarRefreshTimeoutId = window.setTimeout(() => {
    renderSummary();
    renderDays();
  }, 350);
}

function refreshUiAfterEdit() {
  window.clearTimeout(calendarRefreshTimeoutId);
  calendarRefreshTimeoutId = null;
  renderSummary();
  renderDays();
  flushPendingRemoteRender();
}

function renderDayDetailsPreservingFocus() {
  renderDayDetails();
}

function scheduleCalendarRefresh() {
  scheduleCalendarOnlyRefresh();
}

function flushCalendarRefresh() {
  refreshUiAfterEdit();
}

function saveEntryQuietly(entry) {
  persistEntryWithoutUiRefresh(entry);
  scheduleCalendarOnlyRefresh();
}

function saveSelectedEntry(entry, rerender = true) {
  state.entries[selectedDateKey] = entry;
  saveState();

  if (rerender) {
    render();
  } else {
    renderSummary();
    renderDays();
  }
}

function ensureSelectedDate() {
  const current = stripTime(today);
  const schoolYearStart = getSchoolYearStart();
  const schoolYearEnd = getSchoolYearEnd();

  if (current >= schoolYearStart && current <= schoolYearEnd) {
    selectedMonthIndex = getMonthIndexForDate(current);
    selectedDateKey = null;
    return;
  }

  selectedMonthIndex = 0;
  selectedDateKey = null;
}

function goToTodayIfInYear() {
  const current = stripTime(today);
  const schoolYearStart = getSchoolYearStart();
  const schoolYearEnd = getSchoolYearEnd();
  const targetDate = getTodayDateWithinSchoolYear(current, schoolYearStart, schoolYearEnd);
  const selectedDate = getNearestSelectableDate(targetDate, schoolYearEnd);
  selectedMonthIndex = getMonthIndexForDate(selectedDate);
  selectedDateKey = buildDateKey(selectedDate);
  render();
}

function getTodayDateWithinSchoolYear(current, schoolYearStart, schoolYearEnd) {
  const startYear = schoolYearStart.getFullYear();
  const month = current.getMonth();
  const day = current.getDate();
  const candidateYear = month >= 8 ? startYear : startYear + 1;
  const candidate = new Date(candidateYear, month, day);

  if (candidate >= schoolYearStart && candidate <= schoolYearEnd) {
    return candidate;
  }

  if (current < schoolYearStart) {
    return schoolYearStart;
  }

  if (current > schoolYearEnd) {
    return schoolYearEnd;
  }

  return current;
}

function getMonthIndexForDate(date) {
  return calendarMonths.indexOf(date.getMonth());
}

function getMonthDateByIndex(index) {
  const month = calendarMonths[index];
  const startYear = getSchoolYearStart().getFullYear();
  const year = month >= 8 ? startYear : startYear + 1;
  return new Date(year, month, 1);
}

function getDaysForMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month, day);
    days.push({
      date,
      dateKey: buildDateKey(date),
    });
  }

  return days;
}

function getSelectedEntry() {
  return getEntry(selectedDateKey);
}

function getEntry(dateKey) {
  const saved = state.entries[dateKey];
  return {
    dayStatusType: saved?.dayStatusType ?? "",
    dayStatusLabel: saved?.dayStatusLabel ?? "",
    notes: saved?.notes ?? "",
    lessonData: saved?.lessonData ?? {},
    extraLessons: Array.isArray(saved?.extraLessons)
      ? saved.extraLessons.map((lesson) => normalizeExtraLesson(lesson))
      : [],
  };
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isFreeDay(date) {
  return isWeekend(date) || Boolean(getResolvedHolidayInfo(date));
}

function createWeeklyLesson() {
  return {
    subject: "",
    group: "",
  };
}

function normalizeWeeklyPlan(plan = {}) {
  return {
    1: ensureLessonSlots(Array.isArray(plan[1]) ? plan[1] : []),
    2: ensureLessonSlots(Array.isArray(plan[2]) ? plan[2] : []),
    3: ensureLessonSlots(Array.isArray(plan[3]) ? plan[3] : []),
    4: ensureLessonSlots(Array.isArray(plan[4]) ? plan[4] : []),
    5: ensureLessonSlots(Array.isArray(plan[5]) ? plan[5] : []),
  };
}

function getScheduledLessonsForDate(date) {
  if (isWeekend(date)) {
    return [];
  }

  const weekday = date.getDay();
  if (weekday < 1 || weekday > 5 || isFreeDay(date)) {
    return [];
  }

  return state.weeklyPlan[weekday].filter((lesson) => lesson.subject.trim() || lesson.group.trim());
}

function getLessonSummaryForDate(date) {
  const groupedLessons = new Map();

  getScheduledLessonsForDate(date).forEach((lesson) => {
    const subject = lesson.subject.trim();
    const label = getSubjectShortLabel(subject);
    const existing = groupedLessons.get(label);

    if (existing) {
      existing.count += 1;
      return;
    }

    groupedLessons.set(label, {
      label,
      count: 1,
      sortLabel: subject || label,
    });
  });

  return Array.from(groupedLessons.values()).sort((left, right) => left.sortLabel.localeCompare(right.sortLabel, "pl"));
}

function getSubjectShortLabel(subject = "") {
  const normalized = subject.trim().toLowerCase();
  const shortcuts = {
    "informatyka": "INF",
    "inf": "INF",
    "edukacja komputerowa": "EK",
    "ek": "EK",
    "ai": "AI",
    "sztuczna inteligencja": "AI",
    "kt": "KT",
    "kółko techniczne": "KT",
    "kolko techniczne": "KT",
    "zajęcia rozwijające": "ZR",
    "zajecia rozwijajace": "ZR",
    "zr": "ZR",
    "zpt": "ZPT",
    "zajęcia praktyczno-techniczne": "ZPT",
    "zajecia praktyczno-techniczne": "ZPT",
    "technika": "TECH",
    "tech": "TECH",
    "tec": "TECH",
    "majsterkuj z malinką": "MZM",
    "majsterkuj z malinka": "MZM",
    "mzm": "MZM",
  };

  if (!normalized) {
    return "LEK";
  }

  if (shortcuts[normalized]) {
    return shortcuts[normalized];
  }

  const cleaned = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
  }

  return cleaned.slice(0, 4).toUpperCase() || "LEK";
}

function getLessonBadgeClass(label = "") {
  const normalized = label.trim().toUpperCase();

  if (normalized === "EK") {
    return "badge-ek";
  }

  if (normalized === "AI" || normalized === "KT") {
    return "badge-ai";
  }

  if (normalized === "INF") {
    return "badge-inf";
  }

  if (normalized === "ZR") {
    return "badge-zr";
  }

  if (normalized === "ZPT") {
    return "badge-zpt";
  }

  if (normalized === "TECH") {
    return "badge-tech";
  }

  if (normalized === "MZM") {
    return "badge-mzm";
  }

  return "badge-default";
}

function getDayLessonData(entry, index) {
  const saved = entry.lessonData[index] ?? {};
  return {
    topic: saved.topic ?? "",
    notes: saved.notes ?? "",
    completed: Boolean(saved.completed),
    canceled: Boolean(saved.canceled),
    canceledReason: saved.canceledReason ?? "",
    substitute: Boolean(saved.substitute),
    substituteNote: saved.substituteNote ?? "",
  };
}

function getCalendarNotePreview(dateKey) {
  const entry = getEntry(dateKey);
  return String(entry.notes || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function ensureLessonSlots(lessons = []) {
  const normalized = lessons.map((lesson) => ({
    subject: lesson?.subject ?? "",
    group: lesson?.group ?? "",
  }));

  while (normalized.length < DEFAULT_LESSON_SLOTS) {
    normalized.push(createWeeklyLesson());
  }

  return normalized.slice(0, DEFAULT_LESSON_SLOTS);
}

function countRemainingOccurrences(weekday, startDate, endDate) {
  let count = 0;
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    if (pointer.getDay() === weekday && !isFreeDay(pointer)) {
      count += 1;
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return count;
}

function getWeekdayProgress(date) {
  const day = date.getDay();
  if (day < 1 || day > 5) {
    return null;
  }

  const start = getSchoolYearStart();
  const end = getSchoolYearEnd();
  let order = 0;
  let remainingAfter = 0;
  const pointer = new Date(start);

  while (pointer <= end) {
    if (pointer.getDay() === day && !isFreeDay(pointer)) {
      order += 1;

      if (buildDateKey(pointer) === buildDateKey(date)) {
        const afterPointer = new Date(pointer);
        afterPointer.setDate(afterPointer.getDate() + 1);
        remainingAfter = countRemainingOccurrences(day, afterPointer, end);
        return { order, remainingAfter };
      }
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return { order: 0, remainingAfter: countRemainingOccurrences(day, date, end) };
}

function buildSelectedDateSubtitle(date, weekdayProgress) {
  if (!weekdayProgress) {
    return "Weekend nie liczy się do dni nauki.";
  }

  const dayName = weekdayNames[date.getDay()].toLowerCase();
  const holidayInfo = getHolidayInfo(date);

  if (holidayInfo) {
    return `${holidayInfo.name}. Ten dzień jest automatycznie liczony jako wolny.`;
  }

  return `To ${weekdayProgress.order}. ${dayName} roku szkolnego. Po tym dniu zostaje jeszcze ${weekdayProgress.remainingAfter} takich dni nauki.`;
}

function getNearestSelectableDate(startDate, limitDate) {
  const pointer = new Date(startDate);

  while (pointer <= limitDate && isWeekend(pointer)) {
    pointer.setDate(pointer.getDate() + 1);
  }

  return pointer <= limitDate ? pointer : startDate;
}

function getSchoolYearStart() {
  return stripTime(parseDateKey(state.settings.startDate));
}

function getSchoolYearEnd() {
  return stripTime(parseDateKey(state.settings.endDate));
}

function getHolidayInfo(date) {
  const key = buildDateKey(date);
  const schoolYearStart = getSchoolYearStart();
  const schoolYearEnd = getSchoolYearEnd();
  const startYear = schoolYearStart.getFullYear();
  const holidayMap = {
    [buildDateKey(schoolYearStart)]: { name: "Rozpoczęcie roku szkolnego", short: "start" },
    [buildDateKey(schoolYearEnd)]: { name: "Zakończenie roku szkolnego", short: "koniec" },
    [`${startYear}-11-11`]: { name: "Narodowe Święto Niepodległości", short: "11 XI" },
    [`${startYear}-12-25`]: { name: "Boże Narodzenie", short: "święto" },
    [`${startYear}-12-26`]: { name: "Drugi dzień Bożego Narodzenia", short: "święto" },
    [`${startYear + 1}-01-01`]: { name: "Nowy Rok", short: "święto" },
    [`${startYear + 1}-01-06`]: { name: "Trzech Króli", short: "święto" },
    [`${startYear + 1}-05-01`]: { name: "Święto Pracy", short: "święto" },
    [`${startYear + 1}-05-03`]: { name: "Święto Konstytucji 3 Maja", short: "3 V" },
  };

  const easter = getEasterSunday(startYear + 1);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easterMonday.getDate() + 1);
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);

  holidayMap[buildDateKey(easterMonday)] = { name: "Poniedziałek Wielkanocny", short: "święto" };
  holidayMap[buildDateKey(corpusChristi)] = { name: "Boże Ciało", short: "święto" };

  addHolidayRange(holidayMap, "2026-12-25", "2026-12-31", "Przerwa świąteczna", "święta");
  addHolidayRange(holidayMap, "2027-01-18", "2027-01-31", "Ferie zimowe", "ferie");
  addHolidayRange(holidayMap, "2027-03-25", "2027-03-30", "Przerwa wielkanocna", "Wlk");
  holidayMap["2027-06-25"] = { name: "Zakończenie roku szkolnego", short: "koniec" };

  return holidayMap[key] ?? null;
}

function addHolidayRange(holidayMap, startKey, endKey, name, short) {
  const pointer = parseDateKey(startKey);
  const endDate = parseDateKey(endKey);

  while (pointer <= endDate) {
    holidayMap[buildDateKey(pointer)] = { name, short };
    pointer.setDate(pointer.getDate() + 1);
  }
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildSelectedDateSubtitleResolved(date, weekdayProgress) {
  if (!weekdayProgress) {
    return "Weekend nie liczy się do dni nauki.";
  }

  const dayName = weekdayNames[date.getDay()].toLowerCase();
  const holidayInfo = getResolvedHolidayInfo(date);

  if (holidayInfo) {
    return holidayInfo.source === "custom"
      ? `${holidayInfo.name}. Ten dzień jest oznaczony jako wolny w Twoim kalendarzu.`
      : `${holidayInfo.name}. Ten dzień jest automatycznie liczony jako wolny.`;
  }

  return `To ${weekdayProgress.order}. ${dayName} roku szkolnego. Po tym dniu zostaje jeszcze ${weekdayProgress.remainingAfter} takich dni nauki.`;
}

function getResolvedHolidayInfo(date) {
  const customDayStatus = getCustomDayStatusInfo(buildDateKey(date));
  if (customDayStatus) {
    return customDayStatus;
  }

  return getHolidayInfo(date);
}

function buildDateKey(date) {
  const localDate = stripTime(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
