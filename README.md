# PlusLiga Manager Demo

Statyczne demo przegladarkowego managera siatkarskiego z baza klubow PlusLigi i PLS 1 Ligi oraz tekstowym silnikiem meczowym. Wersja jest celowo lekka: mozna uruchomic ja lokalnie bez instalowania zaleznosci, otwierajac `index.html`.

## Jak uruchomic

1. Otworz plik `plusliga_manager_demo/index.html` w przegladarce.
2. W oknie startowym wybierz lige i klub, ktorym chcesz grac.
3. Wejdz w `Mecz tekstowy` albo kliknij gorny przycisk `Przejdz do meczu`.
4. Na ekranie meczu wybierz `Point by point` albo `Szybka symulacja`.

W trybie point by point mecz moze leciec sam powoli: kolejne zagrania jednej akcji pojawiaja sie po sobie. Pauza zatrzymuje mecz dopiero po dokonczeniu biezacej akcji. Przy sytuacji spornej gra pokazuje decyzje `Wez challenge` / `Nie bierz challenge` oraz podpowiedz sztabu, ktora moze byc bledna. Lepszy sztab czesciej trafia z podpowiedzia, ale nie zmienia samego wyniku challenge. Mozesz tez uruchomic jedna akcje recznie, wziac czas, wykonac zmiane w swoim zespole albo w dowolnym momencie dokonczyc spotkanie szybka symulacja.

## Co jest w demie

- Dwie ligi: PlusLiga i PLS 1 Liga.
- Okno startowe kariery: wybierasz lige i jeden klub, ktorym grasz przez sezon.
- Widok centrum klubu, skladu, tabeli, terminarza, bazy klubow i meczu tekstowego.
- Realne nazwy klubow i zawodnikow jako startowa baza danych, zaktualizowane pod kadry 2025/26.
- Rozszerzone atrybuty zawodnikow dostosowane do pozycji: serwis, sila serwisu, kilka typow ataku, kiwka, omijanie bloku, rozegranie, wystawa, przyjecie, obrona, asekuracja, ustawianie do bloku i blok.
- Szczegolowe umiejetnosci sa w skali 1-50, a overall zawodnika i sila skladu zostaja w skali do 100.
- Overall jest liczony osobno dla pozycji: rozgrywajacy mocniej z rozegrania i wystawy, libero z przyjecia/obrony, srodkowi z bloku i ataku ze srodka, a skrzydlowi z profilu ataku oraz przyjecia.
- Korekty statystyczne sezonu 2025/26 mocniej rozdzielaja liderow i graczy rotacyjnych; zawodnicy bez potwierdzonego wysokiego wolumenu statystycznego maja ograniczona losowa premia.
- Silnik meczowy best-of-five z tekstowym przebiegiem akcji: serwis z ryzykiem, przyjecie, overpass, wystawa, atak, blok, blok-out, wyblok, obrona, free ball, bledy, challenge i punktacja ligowa.
- Dwa tempa meczu wybranego klubu: szybka symulacja do konca albo point by point z decyzjami miedzy akcjami.
- W trybie live: czas na zadanie, zmiany pozycja za pozycje, limity czasow i zmian odnawiane w kazdym secie.
- Reczne rozgrywanie tylko meczow wybranego klubu; pozostale spotkania ligi symuluje komputer.
- Zapis stanu w `localStorage`, wiec demo pamieta rozegrane kolejki w tej samej przegladarce.

## Zakres danych

PlusLiga jest oparta o oficjalna liste transferowa PLS i rankingi Volleyball World/PlusLiga. PLS 1 Liga zostala przepisana na sklady 2025/26 z publikacji Polsatu/PLS. Atrybuty nadal sa modelem managerskim, nie kopia jeden do jednego z arkusza statystycznego, ale liderzy rankingow dostaja reczne korekty w odpowiednich cechach.

## Inspiracje projektowe

Demo jest blizej klasycznego managera sportowego niz gry arcade: wazniejsze sa sklad, role zawodnikow, terminarz, tabela, tekstowy przebieg akcji i decyzje managera. Przy dalszym rozwoju warto isc w kierunku:

- dokladniejszego modelu rotacji, libero i ustawien,
- taktyk serwisu, bloku, rozegrania i ataku,
- treningu, formy, morale i zmeczenia,
- rynku transferowego i kontraktow,
- skautingu oraz rozwoju juniorow,
- rozbudowanych statystyk pomeczowych.

## Zrodla startowe

- https://www.plusliga.pl/news%2Cplusliga-20252026-oficjalne-transfery-i-zmiany-w-kadrach-klubowych.html
- https://www.plusliga.pl/players/section/playersByPosition/tour/52/nocookies/1.html
- https://en.volleyballworld.com/volleyball/competitions/plusliga/statistics/
- https://www.pls1liga.pl/
- https://www.polsatsport.pl/galeria/2025-09-19/pls-1-liga-siatkarzy-sklady-druzyn-trenerzy-kto-gra-nowy-sezon-20252026_27587/
- https://siatkowka.gkskatowice.eu/zespol/m
- https://bbtsbielsko.pl/zawodnicy
- https://setter.gg/
- https://kutay-interactive.itch.io/pro-volleyball-manager
